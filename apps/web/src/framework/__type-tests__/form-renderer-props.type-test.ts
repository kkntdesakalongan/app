/**
 * Compile-time cases for app input adapter defaults against renderer props.
 * Type-checked by web `type-check`; excluded from vitest by filename.
 */
import { createInputPropsRegistry } from '@southneuhof/loom'

// Correct file defaults pass.
const adaptersOk = createInputPropsRegistry({
  file: { defaults: { accept: ['application/pdf'] } },
})
void adaptersOk

// Incorrect known file defaults fail.
const adaptersBad = createInputPropsRegistry({
  // @ts-expect-error adapter defaults use the file renderer contract
  file: { defaults: { accept: 'application/pdf' } },
})
void adaptersBad
