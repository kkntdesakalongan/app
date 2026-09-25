import { defineComponent, h, type PropType } from 'vue'
import type { AssetValue, DisplayRendererRegistriesInput } from '@southneuhof/loom'
import Chip from '@southneuhof/loom/components/base/Chip.vue'
import ImagePreviewMulti from '@southneuhof/loom/components/base/ImagePreviewMulti.vue'
import FileComponent from '@southneuhof/loom/components/utils/FileComponent.vue'

type ChipColor = 'primary' | 'secondary' | 'tertiary' | 'warning' | 'error' | 'info' | 'success' | 'neutral'
type ChipOption = { color?: ChipColor; label?: string }

const chipRenderer = defineComponent({
  name: 'AppDisplayChipRenderer',
  props: {
    value: { type: null, default: undefined },
    options: {
      type: Object as PropType<Record<string, ChipOption>>,
      default: () => ({}),
    },
  },
  setup(props) {
    return () => {
      const option = props.options[String(props.value)]
      return h(Chip, { color: option?.color ?? null }, () => option?.label ?? String(props.value ?? '-'))
    }
  },
})

const textBlockRenderer = defineComponent({
  name: 'AppDisplayTextBlockRenderer',
  props: { value: { type: null, default: undefined } },
  setup: (props) => () => h('div', { class: 'whitespace-pre-wrap' }, String(props.value ?? '-')),
})

const imageRenderer = defineComponent({
  name: 'AppDisplayImageRenderer',
  props: { value: { type: null, default: undefined } },
  setup(props) {
    return () => {
      if (props.value === undefined || props.value === null || (Array.isArray(props.value) && props.value.length === 0)) return h('span', '-')
      const values = Array.isArray(props.value) ? props.value : [props.value]
      return h(ImagePreviewMulti, { assets: values as AssetValue[], disableControls: true })
    }
  },
})

const fileRenderer = defineComponent({
  name: 'AppDisplayFileRenderer',
  props: { value: { type: null, default: undefined } },
  setup(props) {
    return () => {
      if (props.value === undefined || props.value === null || (Array.isArray(props.value) && props.value.length === 0)) return h('span', '-')
      const files = Array.isArray(props.value) ? props.value : [props.value]
      return h(
        'div',
        { class: 'flex flex-col gap-1' },
        files.map((file, index) => h(FileComponent, { key: index, asset: file as AssetValue, style: 'link' }))
      )
    }
  },
})

function itemText(item: unknown): string {
  if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') return String(item)
  if (item === null || item === undefined) return '-'
  return JSON.stringify(item) ?? String(item)
}

const arrayRenderer = defineComponent({
  name: 'AppDisplayArrayRenderer',
  props: { value: { type: null, default: undefined } },
  setup(props) {
    return () =>
      h(
        'ul',
        { class: 'list-disc ps-5' },
        (Array.isArray(props.value) ? props.value : [props.value]).filter(Boolean).map((item) => h('li', itemText(item)))
      )
  },
})

declare module '@southneuhof/loom/renderers/displayContracts' {
  interface DisplayRendererComponents {
    chip: typeof chipRenderer
    html: typeof textBlockRenderer
    image: typeof imageRenderer
    file: typeof fileRenderer
    'array-clauses': typeof arrayRenderer
  }
}

export const appDisplayRenderers = {
  chip: chipRenderer,
  html: textBlockRenderer,
  image: imageRenderer,
  file: fileRenderer,
  'array-clauses': arrayRenderer,
} satisfies DisplayRendererRegistriesInput
