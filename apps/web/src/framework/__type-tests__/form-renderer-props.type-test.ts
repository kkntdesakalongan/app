import { defineForm } from '@southneuhof/loom'
import type { FormRendererProps } from '@southneuhof/loom/renderers/formContracts'
import { z } from 'zod/v4'

const nameProps = {
  autocomplete: 'name',
  inputmode: 'text',
  maxlength: 120,
  'data-owner': 7,
} satisfies FormRendererProps<'text'>

const misspelledProps: FormRendererProps<'text'> = {
  // @ts-expect-error TextInput does not publish this prop.
  placehoder: 'Name',
}

const form = defineForm({
  schema: z.object({ name: z.string() }),
  fields: { name: { renderer: 'text', props: nameProps } },
})

void form
void misspelledProps
