# Migrate HK Shield ADS to current Loom

Migrate the vendored package and its website consumers together. Preserve existing
module behavior. Use the new framework implementation instead of merging the old
Form runtime into it. This guide records the agreed migration; migration has not run.

## 1. Pin the source and protect local work

These revisions were checked against each repository's remote `main` on 2026-11-01:

- HK source HEAD and remote `main`: `4be5a82be4ea3ee736bb8827a86cbb2c054031e6`.
- Target standalone Loom `a1a0aec51b445a30784f94777dd4a97829905e07` from
  `https://github.com/southneuhof/loom.git`. This is its latest remote `main`.
- Equivalent Carta HEAD and remote `main`: `e6fa71cd415e9b97e7067f6f4ec2facc48a66621`, directory
  `packages/loom`. Its package tree is `3ed46ee694a5a12b9db09f0faf6336cffa6eca37`.

The standalone Loom tree matches that Carta package tree exactly. The target includes
the toolbar, navigation, route-type, Form, Switch, summary, and required-message changes.

For historical patch comparison, HK's last recorded full import used
`9cb6a1d2b8712e2e79f04b8abc36f3f4e69ff351`. HK subsequently imported upstream
image alignment `71b4016787cef9c372e3d43132fa566c133cb2ef` in local commit
`a5d1888d4197bb0531b8a345c8b25b9727ab9933`. Include these later imports and all
local changes through HK's current HEAD. The historical import is not the migration source HEAD.

The HK destination is `produksi/website/packages/loom`. Package version `2.0.0`
does not identify the source revision. Pin the commit, not the version or moving `main`.

Read HK's root and website `AGENTS.md`, its website skills, and its current package
update records before execution. Follow [the update procedure](../framework-sync.md#update-carta-packages-in-a-project)
for work protection and conflict resolution. HK uses a vendored directory and has
its own workspace layout. Inspect its actual update tooling before choosing a command.

Record the current branch, HEAD, package provenance, and status. Preserve tracked,
untracked, and ignored local work as the update procedure requires. The revisions
above are comparison points, not instructions to reset HK to an older checkout.
Before execution, recheck all three remote heads. If a head has advanced, inspect
the intervening changes and update this revision record before fixing the target.
Reconfirm the standalone Loom and Carta package tree match for the chosen source.

Limit the migration to Loom, website consumers, and directly required tooling or
guidance updates. Keep HK's Laravel transport and asset adapters. Use
[the current architecture](ARCHITECTURE.md) for the framework contract. Carta's
Hono adapters and API aliases are not HK integration code.

Completion: the source revision is fixed, local work has a recovery reference,
and each local package patch has a disposition before replacement.

## 2. Classify local package patches before resolving conflicts

Compare the import baseline, current HK source, and target package. Apply the
target implementation for behavior already absorbed upstream. Retain genuine
HK-specific behavior in the smallest local change.

| HK difference | Migration action |
| --- | --- |
| Custom-slot `validation:touch` connection in `Form.vue` | Use upstream. The connection is already present. |
| Checked disabled Switch appearance | Use upstream. The checked thumb position and dimmed active colors are present. |
| Cached ListView summary data | Use upstream `#context` data: `context`, `loading`, `error`, and `query`. |
| Query carry through ListView, NavigationHeader, and default FormView completion | Use upstream. Remove equivalent app-level merges where the standard view now supplies them. |
| Broad route types and navigation generics | Use upstream `RouteTarget`. Remove HK's additional `TNavigationTarget` parameters and strict/broad helper overloads. |
| `export-controls` slot | Migrate its application use to `toolbar`. There is no compatibility slot. |
| `emptyStringKeys` in schema runtime and validation candidate | Replace with upstream missing-value messages. Do not restore the empty-string inference. |
| Local file-mode import | Use upstream file-mode components and contracts. Preserve each module's selected mode and upload behavior. |
| Tree behavior, table width limits, chip containment, time validation, and renderer inference fixes already present upstream | Use upstream after comparison. Do not reapply duplicate patches. |
| Remaining styling, localized copy, SearchBox guard, workspace aliases, or installation configuration | Preserve local intent. Their cleanup was deferred. |
| Other patches added since the recorded audit, including modal close or query-refresh behavior | Inspect their history and compare with the target. Preserve behavior that the target does not supply. |

Read HK's `advisor-plans/010-swa-route-target-type-boundary.md`,
`advisor-plans/013-update-loom-and-frontend-skills.md`, and
`advisor-plans/021-loom-local-file-source-migration.md` for route-type and import provenance.
Commit `b65ddb60` introduced the required-string workaround. Most Form files still
match the imported baseline. The local validation change is not a reason to keep
the old session, behavior runtime, or schema implementation.

Use upstream's current test and diagnostic configuration. Do not restore removed
diagnostic machinery or deleted test inventories to make an old package script run.
Preserve unrelated application tests and adapt existing cases to the current API.

Completion: conflict decisions preserve behavior without retaining duplicate
framework implementations, compatibility aliases, or retired APIs.

## 3. Migrate one module, then apply the same pattern to the remaining consumers

Start with QHSSE Info for standard create, list, detail, and edit behavior. Then
use Observations for draft-dependent inputs and SWA Reports for custom detail cards.
Use [Carta's Users resource](../../apps/web/src/routes/%28authenticated%29/settings/users/users.resource.ts)
as the current declaration example, not as a replacement for HK business rules.

### Bind resource operations with calls

Replace object-shaped `resource.list` and `resource.create` consumption:

```vue
<ListView v-bind="resource.list()" />
<FormView v-bind="resource.create()" />
<DetailView v-bind="resource.detail({ id })" />
<FormView v-bind="resource.update({ id })" />
```

Migrate loader references too. For example, `roles.list.table.load` becomes
`roles.list().table.load`. Replace a computed page bag reactively when its ID or
runtime inputs change. Keep only the operations the module already supports.

Pass live dependencies at binding time, for example
`resource.create({ context: liveContext })`. Static forms need no context wrapper
or new loader. Keep component option loaders on their input components.

### Return complete field configurations

Replace old presentation behavior such as `behavior.visible`, `behavior.props`,
and dynamic renderer or span callbacks with a field resolver. Use
`FormFieldContext<Input, Context>` from Loom for an explicit scope type when needed.

For a field whose existing static configuration is `projectInput`:

```ts
project_id: ({ draft, context }: FormFieldContext<Input, Context>) => ({
	...projectInput,
	visible: !context.projectLocked,
	span: 6,
	props: {
		...projectInput.props,
		disabled: context.projectLocked,
		searchParameters: { division_id: draft.division_id },
	},
})
```

Use the module's actual schema input and context types. Preserve every required
loader, prop, binding, default, and value constraint when returning a configuration.
The resolver replaces the whole configuration; it does not merge a props patch.
Keep static fields as objects. `span: 6` and `visible: true` are valid static values.

Keep `behavior.derived` for calculated writes. Preserve dynamic renderer use when
the renderers accept the same model contract. Keep multi-key `binding.keys`,
`read`, and `write` for controls such as LocationInput. These features remain supported.
Use schema transforms for conversion between schema input and submitted output.

Map loaded records to editable input explicitly. Keep `initialValue`, `initialData`,
and loaded draft semantics. Explicit `undefined`, `null`, `false`, and zero values
must retain their meaning. Keep each stepper form on the existing managed Form path.

### Migrate table and detail configuration only where needed

Keep static display entries unchanged. A detail resolver receives `{ record, context }`.
A table column resolver receives `{ context }`. Put row-dependent display configuration
in `cell: ({ record, context }) => configuration`. A column with `cell` cannot also
declare flat `read`, `renderer`, `props`, or `format` members.

Use framework-owned types. Preserve sort keys, exports, permissions, and the distinction
between editable schema input and returned records.

### Let Loom own reads and cache identity

Use bound loaders directly. Remove duplicate cache keys or namespace plumbing only
where the bound loader now supplies their identity. Preserve deliberate namespaces
for independent instances and existing controlled URL queries. Do not remove a
query owner without preserving its filters, pagination, and URL behavior.

For standard detail pages, derive custom content from DetailView's managed record:

```vue
<DetailView v-bind="resource.detail({ id })">
	<template #body="{ record, detail }">
		<Detail v-bind="detail" />
		<ReportCards :record="record" />
	</template>
</DetailView>
```

The body replaces the default detail card. Keep the supplied `detail` bag's data
source intact. It contains the same record supplied to the body.

For a page that replaces the entire DetailView, use
`useRecord(() => resource.detail({ id: id.value }).detail)`. It returns record,
loading, error, empty, and refresh state. Use `useCollection` for a fully custom
list that needs the same managed collection read contract.

In SWA Reports, feed Riwayat Laporan, Lampiran, Tindak Lanjut, and Keterangan
Realisasi from the managed record when those sections use detail response data.
Remove record copies populated only inside a network loader callback. A cache hit
must render the same sections. Preserve separate endpoint reads where the module
actually requires them.

Keep collection auxiliary data in `CollectionResult.context`. Read above-table
summaries from ListView's `#context` slot. Result context is distinct from the
authored display `context`. A `#collection` slot replaces row content; it is not
an above-table summary slot.

### Replace toolbar and navigation adaptations

In `src/features/work-items/WorkItemsMaster.vue`, rename `#export-controls` to
`#toolbar`. Keep its expand, collapse, and preview controls. Keep `:export="false"`
to hide standard Excel export. The toolbar slot is additive and has no export props.

Use upstream `withCurrentQuery` only for custom links that still need an explicit
merge. Standard list actions, explicit Back links, and default form completion
already merge the current query. Destination query keys override carried keys.
Custom `afterSubmit.navigate(target)` uses exactly the supplied destination.

Keep strict route-name and parameter checks at resource declarations. Shared views
use `RouteTarget`. A raw destination authored directly for a view can retain strict
checking with `satisfies RouteLocationRaw`. Keep conversions at actual router calls.

### Adopt required-value messages without changing defaults

Use the upstream generic message, `This field is required.`, when a schema rejects
a missing or null value without an authored message. Explicit schema messages win.
Empty strings still follow their existing schema rules. Accepted null, undefined,
zero, and false values remain unchanged.

Remove HK's `emptyStringKeys` inference and candidate substitution when resolving
the package conflict. Keep existing module defaults, including QHSSE Info's blank
title and description defaults. No consumer rewrite is needed merely to receive
the generic fallback. Do not rewrite every schema to reproduce old message text.

Completion: each touched module uses the new APIs and retains its existing data,
permissions, workflow, form values, and navigation behavior.

## 4. Verify the migration with existing proof

Read HK's proof-selection guidance and review existing tests before changing them.
Add no regression suites or coverage targets. Update existing test calls and
triggers only where the approved API changed. Keep their meaningful assertions.

From `produksi/website`, run:

```sh
pnpm --filter @southneuhof/loom type-check
pnpm --filter @hk-shield/website build
```

The website build includes route generation, app type-checking, Tailwind checks,
and the production build. Check the current scripts before execution. Run focused
existing module and Loom tests for changed owners. Run the existing scoped lint
command for changed application files. Avoid formatting the entire vendored package.

Exercise these representative flows with the actual migrated views:

- QHSSE Info create and edit retain defaults, custom inputs, validation, and asset values.
- Observations retains dependent choices and values when its field configuration changes.
- SWA Reports renders its detail cards after both a fresh fetch and a cache-hit revisit.
- A list on page 3 retains its query through detail and the page's Back button.
- Work Items shows its custom toolbar, with standard Excel export disabled.

Use the generated HK route map for the final type-check. If CI reports TS2590 or
`Map maximum size exceeded`, capture the exact revision and diagnostic. The confirmed
route-union fix does not establish the cause of every compiler crash.

Keep failures separate from baseline failures established on the recorded starting
revision. Report configured-runtime or browser checks that could not run. A build
alone does not verify cache-hit cards or user navigation.

## 5. Hand back one migration result

Record the final package revision, retained local patches, migrated consumer paths,
actual check results, and any unverified behavior in HK's existing migration record.
Update affected HK authoring guidance so later agents follow the current API.
Confirm that unrelated work is restored and that no conflict markers remain.
Keep publication and application push actions within the user's execution authorization.

Completion requires the pinned package, all affected consumers, preserved local work,
and sufficient passing proof. A successful package merge alone is not completion.
