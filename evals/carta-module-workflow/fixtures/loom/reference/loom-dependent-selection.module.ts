import { z } from 'zod/v4'
import { defineForm } from '@southneuhof/loom'
import { loadTeams, saveRequest } from './loom-dependent-selection.services'

const schema = z.object({
  departmentId: z.string().min(1),
  teamId: z.string().nullable(),
})

export const editorForm = defineForm({
  schema,
  labels: { departmentId: 'Department', teamId: 'Team' },
  fields: {
    departmentId: {
      renderer: 'select',
      props: {
        data: [{ id: 'north', name: 'North' }, { id: 'south', name: 'South' }],
        pick: 'id',
        view: 'name',
        searchable: false,
      },
    },
    teamId: {
      renderer: 'select',
      props: { load: loadTeams, pick: 'id', view: 'name', searchable: false },
      behavior: {
        disabled: ({ draft }) => !draft.departmentId,
        props: ({ draft }) => ({ searchParameters: { departmentId: draft.departmentId } }),
      },
    },
  },
  submit: saveRequest,
})
