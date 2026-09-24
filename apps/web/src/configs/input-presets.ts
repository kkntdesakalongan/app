import { editableStatusCodes, statusCatalog } from './statuses'

const statusCodeChoices = editableStatusCodes.map((id) => ({ id, name: statusCatalog[id].label }))

export const appInputPresets = {
  title: { renderer: 'text' },
  name: { renderer: 'text' },
  fullName: { renderer: 'text' },
  username: { renderer: 'text' },
  code: { renderer: 'text' },
  email: { renderer: 'text', props: { type: 'email' } },
  telephone: { renderer: 'text', props: { type: 'tel' } },
  description: { renderer: 'textarea' },
  active: { renderer: 'switch', initialValue: () => true },
  statusCode: { renderer: 'radio', props: { data: statusCodeChoices } },
  startDate: { renderer: 'date' },
  endDate: { renderer: 'date' },
  year: { renderer: 'year' },
} as const
