import { createInputPropsRegistry, type InputPropsAdapter } from '@southneuhof/loom'
import { assetAdapter } from '../adapters/assets'

type ExplicitSource = { load: unknown; namespace?: string }
type LookupSource = ExplicitSource & { loadDetail: unknown }
type LookupProps = Record<string, unknown>

function loaderProps(source: ExplicitSource, renderer: string): Record<string, unknown> {
  if (typeof source.load !== 'function') throw new Error(`Input source for "${renderer}" needs a load function.`)
  return {
    load: source.load,
    ...(typeof source.namespace === 'string' ? { namespace: source.namespace } : {}),
  }
}

const lookup: InputPropsAdapter<LookupSource, LookupProps> = {
  normalize: (source) => {
    const result = loaderProps(source, 'lookup')
    if (typeof source.loadDetail !== 'function') throw new Error('Lookup input source needs a loadDetail function.')
    return {
      ...result,
      loadDetail: source.loadDetail,
    }
  },
}
const options: InputPropsAdapter<ExplicitSource, Record<string, unknown>> = { normalize: (source) => loaderProps(source, 'options') }

export const appInputProps = createInputPropsRegistry({
  lookup,
  select: options,
  radio: options,
  'checkbox-group': options,
  file: { value: { hydrate: assetAdapter.read }, defaults: { upload: assetAdapter.upload, toModel: assetAdapter.read } },
  image: { value: { hydrate: assetAdapter.read }, defaults: { upload: assetAdapter.upload, toModel: assetAdapter.read, imageURLResolver: assetAdapter.preview } },
})
