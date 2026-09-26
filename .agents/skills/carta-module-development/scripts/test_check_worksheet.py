"""Run with python3 -m unittest discover -s <this directory>."""
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from check_worksheet import check, table
import json


class WorksheetCheck(unittest.TestCase):
    def test_reads_all_matching_tables_and_checks_later_rows(self):
        source = '| ID | Value |\n|---|---|\n| B-01 | One |\n\n## Next\n\n| ID | Value |\n|---|---|\n| B-02 | Two |\n'
        self.assertEqual(table(source, ['ID', 'Value']), [
            {'ID': 'B-01', 'Value': 'One'}, {'ID': 'B-02', 'Value': 'Two'}])
        with self.assertRaises(ValueError):
            table(source.replace('| B-02 | Two |', '| B-02 | Two | Extra |'), ['ID', 'Value'])

    def test_coverage_and_completion(self):
        with TemporaryDirectory() as directory:
            folder = Path(directory)
            design = '''| Obligation | Rule references | Acceptance IDs |
|---|---|---|
| W-01.normal | B-01 | A-01 |
```yaml
id: B-01
```
```yaml
id: A-01
```
'''
            design += '\n| Journey | Obligation | Acceptance IDs | Distinct interaction |\n|---|---|---|---|\n'
            worksheet = '''- State: `DONE`
- Latest review: report.md
| Plan | File | Depends on | Status | Review |
|---|---|---|---|---|
| P-01 | 001-result.md | NONE | VERIFIED | report.md |

| Acceptance | Required surfaces |
|---|---|
| A-01 | UNIT |

| Acceptance | Plan | Surface | Test case | Implementation | Evidence | Review | Result |
|---|---|---|---|---|---|---|---|
| A-01 | P-01 | UNIT | request.spec.ts::saves and reloads | app.ts:save | green.json | report.md | PASS |
'''
            worksheet = '| Journey | Test case |\n|---|---|\n\n' + worksheet
            (folder / 'design.md').write_text(design)
            (folder / 'worksheet.md').write_text(worksheet)
            plan = '- Acceptance: A-01\n'
            (folder / '001-result.md').write_text(plan)
            (folder / 'report.md').write_text('Evidence')
            snapshot = {'inputs': ['app.ts'], 'fingerprint': '0' * 64}
            green = {'scope': 'command', 'status': 'PASS', 'result': {'exitCode': 0}, 'before': snapshot, 'after': snapshot}
            (folder / 'green.json').write_text(json.dumps(green))
            for changed in [
                {**green, 'status': 'FAIL'},
                {**green, 'result': {'exitCode': 2}},
                {**green, 'after': {**snapshot, 'fingerprint': '1' * 64}},
                {**green, 'scope': 'static'},
            ]:
                (folder / 'green.json').write_text(json.dumps(changed))
                self.assertTrue(check(folder))
            (folder / 'green.json').write_text(json.dumps(green))
            self.assertEqual(check(folder), [])
            for surface in ['BROWSER', 'VISUAL']:
                (folder / 'worksheet.md').write_text(worksheet.replace('UNIT', surface))
                self.assertTrue(any('invalid required surfaces' in error for error in check(folder)))
            (folder / 'worksheet.md').write_text(worksheet)
            (folder / 'design.md').write_text(design + '| J-01 | W-01.normal | A-01 | Save |\n')
            self.assertTrue(any('browser mappings' in error for error in check(folder)))
            (folder / 'design.md').write_text(design)
            mapped = worksheet.replace('| Journey | Test case |\n|---|---|\n',
                '| Journey | Test case |\n|---|---|\n| J-01 | request.spec.ts::save |\n')
            (folder / 'worksheet.md').write_text(mapped)
            self.assertTrue(any('browser mappings' in error for error in check(folder)))
            (folder / 'design.md').write_text(design[:design.index('| Journey |')])
            (folder / 'worksheet.md').write_text(worksheet[worksheet.index('- State:'):])
            self.assertEqual(check(folder), [])
            (folder / 'design.md').write_text(design)
            (folder / 'worksheet.md').write_text(worksheet)
            crud = design.replace('```yaml\nid: B-01\n```',
                '\n| ID | Action | Access and scope | Inputs | Rules or exceptions | Expected result | Acceptance IDs |\n'
                '|---|---|---|---|---|---|---|\n| B-01 | Create | Admin | Name | Unique | Saved | A-01 |\n')
            crud = crud.replace('```yaml\nid: A-01\n```',
                '\n| ID | Rule references | Given | Action and input | Expected result and stored/unchanged values | Required visible result |\n'
                '|---|---|---|---|---|---|\n| A-01 | B-01 | Admin | Create One | One stored | One after reload |\n')
            (folder / 'design.md').write_text(crud)
            self.assertEqual(check(folder), [])
            action_table = crud[crud.index('| ID | Action |'):crud.index('| ID | Rule references |')].strip()
            acceptance_table = crud[crud.index('| ID | Rule references |'):crud.index('| Journey |')].strip()
            for extra, message in [(action_table, 'duplicate rule IDs'),
                                   (acceptance_table, 'duplicate acceptance record IDs')]:
                (folder / 'design.md').write_text(crud + '\n' + extra + '\n')
                self.assertTrue(any(message in error for error in check(folder)))
            second = '\n' + action_table.replace('B-01', 'B-02').replace('A-01', 'A-02')
            second += '\n\n' + acceptance_table.replace('B-01', 'B-02').replace('A-01', 'A-02') + '\n'
            (folder / 'design.md').write_text(crud + second)
            self.assertTrue(check(folder))
            multi = (crud + second).replace('| W-01.normal | B-01 | A-01 |',
                '| W-01.normal | B-01 | A-01 |\n| W-02.normal | B-02 | A-02 |')
            (folder / 'design.md').write_text(multi)
            (folder / 'worksheet.md').write_text(worksheet.replace('| A-01 | UNIT |',
                '| A-01 | UNIT |\n| A-02 | UNIT |') +
                '\n| Acceptance | Plan | Surface | Test case | Implementation | Evidence | Review | Result |\n'
                '|---|---|---|---|---|---|---|---|\n'
                '| A-02 | P-01 | UNIT | request.spec.ts::second save | app.ts:save | green.json | report.md | PASS |\n')
            (folder / '001-result.md').write_text('- Acceptance: A-01, A-02\n')
            self.assertEqual(check(folder), [])
            (folder / 'worksheet.md').write_text(worksheet)
            (folder / '001-result.md').write_text(plan)
            (folder / 'design.md').write_text(crud + '\nid: A-01\n')
            self.assertTrue(check(folder))
            (folder / 'design.md').write_text(crud.replace('| A-01 | B-01 | Admin', '| A-02 | B-01 | Admin'))
            self.assertTrue(check(folder))
            (folder / 'design.md').write_text(design)
            pending = worksheet.replace('`DONE`', '`EXECUTE`').replace('| VERIFIED |', '| IN_PROGRESS |').replace('request.spec.ts::saves and reloads', 'PENDING').replace('| PASS |', '| PENDING |')
            for status in ['TODO', 'IN_PROGRESS', 'BLOCKED']:
                (folder / 'worksheet.md').write_text(pending.replace('| IN_PROGRESS |', f'| {status} |'))
                self.assertEqual(check(folder), [])
            for changed in [pending.replace('| IN_PROGRESS |', '| IMPLEMENTED |'),
                            pending.replace('| PENDING |\n', '| PASS |\n')]:
                (folder / 'worksheet.md').write_text(changed)
                self.assertTrue(check(folder))
            dependency_design = design.replace('| W-01.normal | B-01 | A-01 |', '| W-01.normal | B-01 | A-01, A-02 |') + '\nid: A-02\n'
            dependency_sheet = pending.replace('| P-01 | 001-result.md | NONE | IN_PROGRESS |', '| P-01 | 001-result.md | NONE | IMPLEMENTED |').replace('| A-01 | P-01 | UNIT | PENDING |', '| A-01 | P-01 | UNIT | request.spec.ts::saves and reloads |')
            dependency_sheet = dependency_sheet.replace('| A-01 | UNIT |', '| A-01 | UNIT |\n| A-02 | UNIT |').replace('| P-01 | 001-result.md | NONE | IMPLEMENTED | report.md |', '| P-01 | 001-result.md | NONE | IMPLEMENTED | report.md |\n| P-02 | 002-next.md | P-01 | IN_PROGRESS | PENDING |')
            dependency_sheet += '| A-02 | P-02 | UNIT | PENDING | PENDING | PENDING | PENDING | PENDING |\n'
            (folder / '002-next.md').write_text('- Acceptance: A-02\n')
            (folder / 'design.md').write_text(dependency_design)
            (folder / 'worksheet.md').write_text(dependency_sheet)
            self.assertEqual(check(folder), [])
            (folder / 'worksheet.md').write_text(dependency_sheet.replace('| IMPLEMENTED |', '| IN_PROGRESS |'))
            self.assertTrue(check(folder))
            (folder / 'design.md').write_text(design)
            (folder / 'worksheet.md').write_text(worksheet)
            for broken in [
                worksheet.replace('| PASS |', '| PENDING |'),
                worksheet.replace('| P-01 | UNIT', '| P-02 | UNIT'),
                worksheet.replace('| NONE | VERIFIED', '| P-01 | VERIFIED'),
                worksheet.replace('| UNIT |', '| UNKNOWN |'),
                worksheet.replace('| A-01 | UNIT |', '| A-01 | API, UNIT |'),
                worksheet.replace('| report.md | PASS', '| missing.md | PASS'),
            ]:
                (folder / 'worksheet.md').write_text(broken)
                self.assertTrue(check(folder), broken)
            (folder / 'worksheet.md').write_text(worksheet)
            (folder / '001-result.md').write_text('- Acceptance: A-02')
            self.assertTrue(check(folder))
            (folder / '001-result.md').write_text(plan)
            api_row = '| A-01 | P-01 | API | api.spec.ts::stores result | app.ts:save | green.json | report.md | PASS |\n'
            combined = worksheet.replace('| A-01 | UNIT |', '| A-01 | API, UNIT |') + api_row
            (folder / 'worksheet.md').write_text(combined)
            self.assertEqual(check(folder), [])
            for broken in [
                combined.replace('| UNIT | request.spec.ts::saves and reloads', '| API | request.spec.ts::saves and reloads'),
                combined.replace('| API, UNIT |', '| API |'),
                combined + api_row,
                combined.replace('| P-01 | API |', '| P-02 | API |'),
                combined.replace('| report.md | PASS |\n', '| report.md | PENDING |\n', 1),
            ]:
                (folder / 'worksheet.md').write_text(broken)
                self.assertTrue(check(folder), broken)
            (folder / 'worksheet.md').write_text(combined)
            extra_unit_row = api_row.replace('| API | api.spec.ts::stores result', '| UNIT | request.spec.ts::filters records')
            (folder / 'worksheet.md').write_text(combined + extra_unit_row)
            self.assertEqual(check(folder), [])
            (folder / 'worksheet.md').write_text(worksheet)
            (folder / '001-result.md').write_text(plan)
            (folder / 'design.md').write_text(design + '\n| Invariant ID | Condition that must remain true |\n|---|---|\n| I-01 | A required invariant |\n')
            self.assertTrue(check(folder))
            (folder / 'design.md').write_text(design.replace('```yaml', '| W-01.return | B-02 | A-02 |\n```yaml'))
            self.assertTrue(check(folder))


if __name__ == '__main__':
    unittest.main()
