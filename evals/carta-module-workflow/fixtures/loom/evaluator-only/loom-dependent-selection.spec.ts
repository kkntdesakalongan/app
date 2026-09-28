import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, ref } from 'vue'
import { Form } from '@southneuhof/loom'
import type { RequestDraft } from '../__eval/plan066/loom-dependent-selection.services'
import { editorForm } from '../__eval/plan066/loom-dependent-selection.module'
import {
  holdNorthTeams,
  readSavedRequests,
  readTeamLoads,
  resetRequestFixture,
} from '../__eval/plan066/loom-dependent-selection.services'
import { chooseOption, cleanupFramework, mountFramework, openField, settleForm } from './loom-agent-eval-harness'

afterEach(() => {
  resetRequestFixture()
  cleanupFramework()
})

describe('A dependent selection', () => {
  it('A-01 disables the team field and loads no options when the department is empty', async () => {
    mountFramework(() => h(Form, {
      ...editorForm,
      initialData: { departmentId: '', teamId: null },
    }))

    await vi.waitFor(() => expect(readTeamLoads()).toEqual(['']))
    const trigger = openField('Team')

    expect(trigger.className).toContain('pointer-events-none')
    expect(document.querySelector('[data-reka-popper-content-wrapper]')).toBeNull()
  })

  it('A-02 clears a changed parent selection and ignores a late response for the old parent', async () => {
    const releaseNorth = holdNorthTeams()
    const formRef = ref<{ draft: RequestDraft; submit: () => Promise<void> } | null>(null)
    mountFramework(() => h(Form, {
      ref: formRef,
      ...editorForm,
      initialData: { departmentId: 'north', teamId: 'north-team' },
    }))

    await vi.waitFor(() => expect(readTeamLoads()).toEqual(['north']))
    openField('Department')
    await chooseOption('South')
    await vi.waitFor(() => expect(readTeamLoads()).toEqual(['north', 'south']))
    await vi.waitFor(() => expect(formRef.value?.draft).toEqual({ departmentId: 'south', teamId: null }))

    releaseNorth()
    await settleForm()

    expect(formRef.value?.draft).toEqual({ departmentId: 'south', teamId: null })
  })

  it('A-03 submits the selected team id and department unchanged', async () => {
    const formRef = ref<{ draft: RequestDraft; submit: () => Promise<void> } | null>(null)
    mountFramework(() => h(Form, {
      ref: formRef,
      ...editorForm,
      initialData: { departmentId: 'south', teamId: null },
    }))

    await vi.waitFor(() => expect(readTeamLoads()).toContain('south'))
    openField('Team')
    await chooseOption('South team')
    await formRef.value?.submit()

    expect(formRef.value?.draft).toEqual({ departmentId: 'south', teamId: 'south-team' })
    expect(readSavedRequests()).toEqual([{ departmentId: 'south', teamId: 'south-team' }])
  })
})
