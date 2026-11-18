<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import { onClickOutside, useElementSize, usePreferredReducedMotion } from '@vueuse/core'
import Button from '@southneuhof/loom/components/base/Button.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import Tooltip from '@southneuhof/loom/components/base/Tooltip.vue'
import NumberInput from '@southneuhof/loom/components/inputs/NumberInput.vue'
import TextInput from '@southneuhof/loom/components/inputs/TextInput.vue'
import type { EwsStation } from './useEwsStations'
import type { EwsFilters, EwsReadingFilter, EwsRange } from './ewsFilters'

const props = defineProps<{ layerCount: number }>()
const toolbar = ref<HTMLElement>()
const sheet = ref<HTMLElement>()
const sheetStack = ref<HTMLElement>()
const { height: sheetHeight } = useElementSize(sheetStack)
const sheetId = useId()
const preferredMotion = usePreferredReducedMotion()
const trigger = ref<HTMLElement>()
const tabHighlight = ref<HTMLElement>()
const sliding = ref(false)
let highlightAnimation: Animation | undefined
type FilterSection = 'search' | 'stations' | 'readings' | 'layers'
const openSection = ref<FilterSection>()
const filters = defineModel<EwsFilters>({ default: () => ({}) })
const types = ref<EwsStation['type'][]>([])
const statuses = ref<EwsStation['statusCode'][]>([])
const search = ref('')
const typeOptions = [
  { value: 'landslide', label: 'Landslide' },
  { value: 'flood', label: 'Flood' },
  { value: 'tsunami', label: 'Tsunami' },
] satisfies { value: EwsStation['type']; label: string }[]
const statusOptions = [
  { value: 'normal', label: 'Normal and active' },
  { value: 'warning', label: 'Danger' },
  { value: 'maintenance', label: 'Under repair' },
  { value: 'telemetry_inactive', label: 'Telemetry inactive' },
  { value: 'unknown', label: 'Unknown' },
] satisfies { value: EwsStation['statusCode']; label: string }[]
const ranges = reactive<{ key: EwsReadingFilter; label: string; unit: string; icon: 'rainy' | 'water-percent' | 'earthquake'; min: number | null | undefined; max: number | null | undefined }[]>([
  { key: 'rainfallMm', label: 'Rainfall', unit: 'mm', icon: 'rainy', min: undefined, max: undefined },
  { key: 'waterLevelMeters', label: 'Water level', unit: 'm', icon: 'water-percent', min: undefined, max: undefined },
  { key: 'groundMovementCm', label: 'Ground movement', unit: 'cm', icon: 'earthquake', min: undefined, max: undefined },
])
const tsunamiOnly = computed(() => types.value.length === 1 && types.value[0] === 'tsunami')
const sections = computed(
  () =>
    [
      { key: 'search', label: 'Search', title: 'Station search', icon: 'search', count: Number(Boolean(filters.value.search)) },
      { key: 'stations', label: 'Stations', title: 'Station filters', icon: 'broadcast', count: Number(types.value.length > 0) + Number(statuses.value.length > 0) },
      { key: 'readings', label: 'Readings', title: 'Sensor readings', icon: 'pulse', count: ranges.filter((range) => filters.value[range.key]).length },
      { key: 'layers', label: 'Lapisan', title: 'Lapisan peta', icon: 'stack', count: props.layerCount },
    ] as const
)
const current = computed(() => sections.value.find((section) => section.key === openSection.value))
const activeCount = computed(() => sections.value.reduce((count, section) => count + (section.key === 'layers' ? 0 : section.count), 0))

function retire(element: Element) {
  element.setAttribute('inert', '')
  element.setAttribute('aria-hidden', 'true')
}

onClickOutside(toolbar, () => {
  openSection.value = undefined
})

watch(openSection, (section) => {
  if (!section) highlightAnimation?.cancel()
})

function closeSheet() {
  openSection.value = undefined
  trigger.value?.focus({ preventScroll: true })
}

function slideHighlight(from: HTMLElement, to: HTMLElement) {
  const highlight = tabHighlight.value
  const rail = highlight?.parentElement
  if (!highlight || !rail || preferredMotion.value === 'reduce') return
  const start = highlightAnimation ? highlight.getBoundingClientRect() : from.getBoundingClientRect()
  const destination = to.getBoundingClientRect()
  const railBounds = rail.getBoundingClientRect()
  highlightAnimation?.cancel()
  sliding.value = true
  const animation = highlight.animate(
    [start, destination].map((bounds) => ({
      left: bounds.left - railBounds.left + 'px',
      top: bounds.top - railBounds.top + 'px',
      width: bounds.width + 'px',
      height: bounds.height + 'px',
      opacity: 1,
    })),
    { duration: 240, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
  )
  highlightAnimation = animation
  const finish = () => {
    if (highlightAnimation !== animation) return
    highlightAnimation = undefined
    sliding.value = false
  }
  animation.finished.then(finish, finish)
}

function toggleSheet(key: FilterSection, event: MouseEvent) {
  if (openSection.value === key) {
    closeSheet()
    return
  }
  if (!(event.currentTarget instanceof HTMLElement)) return
  if (openSection.value && trigger.value) slideHighlight(trigger.value, event.currentTarget)
  trigger.value = event.currentTarget
  openSection.value = key
}

watch(
  sheet,
  (panel) => {
    if (!panel || !openSection.value) return
    const target = openSection.value === 'search' ? panel.querySelector('input') : panel
    target?.focus({ preventScroll: true })
  },
  { flush: 'post' }
)

function toggleType(type: EwsStation['type']) {
  types.value = types.value.includes(type) ? types.value.filter((value) => value !== type) : [...types.value, type]
  if (tsunamiOnly.value) statuses.value = statuses.value.filter((value) => value !== 'warning')
}
function toggleStatus(status: EwsStation['statusCode']) {
  if (tsunamiOnly.value && status === 'warning') return
  statuses.value = statuses.value.includes(status) ? statuses.value.filter((value) => value !== status) : [...statuses.value, status]
}
function reset() {
  types.value = []
  statuses.value = []
  search.value = ''
  for (const range of ranges) {
    range.min = undefined
    range.max = undefined
  }
  filters.value = {}
  openSection.value = undefined
  toolbar.value?.querySelector<HTMLElement>('[aria-expanded]')?.focus({ preventScroll: true })
}
watch(
  [types, statuses, search, ranges],
  () => {
    const stations = typeOptions
      .filter((option) => !types.value.length || types.value.includes(option.value))
      .flatMap((option) => {
        const statusCodes = statuses.value.filter((status) => option.value !== 'tsunami' || status !== 'warning')
        if (statuses.value.length && !statusCodes.length) return []
        return [{ type: option.value, ...(statusCodes.length ? { statusCodes } : {}) }]
      })
    const next: EwsFilters = {
      ...(types.value.length || statuses.value.length ? { stations } : {}),
      ...(search.value.trim() ? { search: search.value.trim() } : {}),
    }
    for (const range of ranges) {
      if (range.min != null && range.max != null && range.min > range.max) {
        const previous = filters.value[range.key]
        if (previous) next[range.key] = previous
        continue
      }
      const value: EwsRange = {
        ...(range.min != null ? { min: range.min } : {}),
        ...(range.max != null ? { max: range.max } : {}),
      }
      if (value.min !== undefined || value.max !== undefined) next[range.key] = value
    }
    filters.value = next
  },
  { deep: true }
)
</script>

<template>
  <div
    ref="toolbar"
    class="ews-filter-pill relative isolate w-full text-on-surface"
    :style="{ paddingTop: sheetHeight + 'px' }"
    role="group"
    aria-label="Map filters"
    @keydown.esc="openSection && closeSheet()"
  >
    <div class="sheet-reveal absolute inset-0 overflow-hidden rounded-[1.625rem] bg-surface-container-low shadow-lg">
      <div ref="sheetStack">
        <Transition :css="preferredMotion !== 'reduce'" name="sheet-page" :mode="preferredMotion === 'reduce' ? 'default' : 'out-in'" @before-leave="retire">
          <section
            v-if="current"
            :id="sheetId + current.key"
            :key="current.key"
            ref="sheet"
            tabindex="-1"
            :aria-labelledby="sheetId + current.key + '-title'"
            class="filter-sheet overflow-y-auto overscroll-contain p-4"
          >
            <header class="mb-3 flex items-center justify-between gap-2">
              <h2 :id="sheetId + current.key + '-title'" class="text-lg font-semibold">{{ current.title }}</h2>
              <Button type="button" kind="icon" variant="standard" ariaLabel="Close filter sheet" @click="closeSheet">
                <template #icon><Icon name="close" /></template>
              </Button>
            </header>
            <TextInput v-if="openSection === 'search'" :model-value="search" label="Search stations" placeholder="Station name" @update:model-value="search = String($event ?? '')" />
            <div v-else-if="openSection === 'stations'" class="grid gap-4">
              <fieldset>
                <legend class="mb-2 text-sm font-semibold">Station type</legend>
                <div class="flex flex-wrap gap-2">
                  <Button
                    v-for="option in typeOptions"
                    :key="option.value"
                    type="button"
                    toggle
                    :selected="types.includes(option.value)"
                    v-bind="{ role: 'checkbox', 'aria-checked': types.includes(option.value) }"
                    :variant="types.includes(option.value) ? 'tonal' : 'outlined'"
                    class="px-3"
                    @update:selected="toggleType(option.value)"
                  >
                    {{ option.label }}
                  </Button>
                </div>
              </fieldset>
              <fieldset>
                <legend class="mb-2 text-sm font-semibold">Station status</legend>
                <div class="flex flex-wrap gap-2">
                  <Button
                    v-for="option in statusOptions"
                    :key="option.value"
                    type="button"
                    toggle
                    :selected="statuses.includes(option.value)"
                    v-bind="{ role: 'checkbox', 'aria-checked': statuses.includes(option.value) }"
                    :variant="statuses.includes(option.value) ? 'tonal' : 'outlined'"
                    :disabled="tsunamiOnly && option.value === 'warning'"
                    class="px-3"
                    @update:selected="toggleStatus(option.value)"
                  >
                    {{ option.label }}
                  </Button>
                </div>
              </fieldset>
              <p class="text-xs text-on-surface-variant">An empty group includes all options.</p>
              <p v-if="tsunamiOnly" class="text-xs text-on-surface-variant">Tsunami stations have no danger state.</p>
            </div>
            <div v-else-if="openSection === 'readings'" class="grid gap-4">
              <fieldset v-for="range in ranges" :key="range.key" class="min-w-0">
                <legend class="mb-2 flex items-center gap-2 text-sm font-semibold"><Icon :name="range.icon" size="base" class="text-on-surface-variant" />{{ range.label }}</legend>
                <div class="grid grid-cols-2 gap-2">
                  <NumberInput v-model="range.min" label="Minimum" :suffix="range.unit" />
                  <NumberInput v-model="range.max" label="Maximum" :suffix="range.unit" />
                </div>
                <p v-if="range.min != null && range.max != null && range.min > range.max" role="alert" class="mt-2 text-xs text-error">
                  Minimum cannot exceed maximum. The last valid range stays active.
                </p>
              </fieldset>
              <p class="text-xs text-on-surface-variant">Leave either bound empty for an open range.</p>
            </div>
            <slot v-else name="layers" />
          </section>
        </Transition>
      </div>
    </div>
    <div class="filter-bar relative isolate flex items-center gap-1 rounded-full bg-surface-container p-1.5 shadow-md" :class="{ 'is-sliding': sliding }">
      <span v-show="current" ref="tabHighlight" aria-hidden="true" class="tab-highlight pointer-events-none absolute z-[2] rounded-full bg-primary opacity-0" />
      <Button
        v-for="section in sections"
        :key="section.key"
        type="button"
        :variant="openSection === section.key && !sliding ? 'filled' : section.count ? 'tonal' : 'text'"
        class="filter-cell min-w-0 flex-auto px-2 focus-visible:-outline-offset-2 [&>span]:min-w-0 [&>span]:max-w-full"
        :class="{
          'has-filter': section.count > 0,
          'search-cell': section.key === 'search',
          'basis-20': section.key === 'search' && filters.search,
          'bg-surface-container-highest text-on-surface': section.key === 'search' && openSection !== 'search' && !section.count,
          'text-on-surface-variant': section.key !== 'search' && !section.count && openSection !== section.key,
        }"
        v-bind="{ 'aria-expanded': openSection === section.key, 'aria-controls': openSection === section.key ? sheetId + section.key : undefined }"
        @click="toggleSheet(section.key, $event)"
      >
        <template #icon
          ><span aria-hidden="true"><Icon :name="section.icon" size="lg" /></span
        ></template>
        <span v-if="section.key === 'search' && filters.search" class="sr-only">Search:</span>
        <span class="truncate">{{ section.key === 'search' && filters.search ? filters.search : section.label }}</span>
        <Transition :css="preferredMotion !== 'reduce'" name="count">
          <span
            v-if="section.count && section.key !== 'search'"
            class="filter-count ml-1 shrink-0 rounded-full border border-transparent px-1.5 text-xs tabular-nums"
            :class="openSection === section.key && !sliding ? 'bg-on-primary text-primary' : 'bg-on-secondary-container text-secondary-container'"
            ><span :key="section.count" class="count-value">{{ section.count }}</span></span
          >
        </Transition>
      </Button>
      <Transition :css="preferredMotion !== 'reduce'" name="reset" @before-leave="retire">
        <div v-if="activeCount" class="filter-reset shrink-0 overflow-hidden rounded-full">
          <Tooltip>
            <template #trigger>
              <Button type="button" kind="icon" variant="standard" :ariaLabel="`Reset ${activeCount} active filters`" @click="reset"
                ><template #icon><Icon name="filter-off" /></template
              ></Button>
            </template>
            <template #content>Reset station filters</template>
          </Tooltip>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.ews-filter-pill {
  container-type: inline-size;
  transition: padding-top 150ms var(--filter-ease);
  --filter-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
.filter-sheet {
  outline: none;
  max-height: min(32rem, calc(100dvh - var(--map-controls-bottom) - 9rem));
}
.sheet-page-leave-active {
  transition: opacity 80ms ease-out;
}
.sheet-page-enter-active {
  transition: opacity 120ms ease-out 150ms;
}
.sheet-page-enter-from,
.sheet-page-leave-to {
  opacity: 0;
}
.is-sliding .filter-cell {
  background: transparent;
}
.is-sliding .filter-cell::before {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  content: '';
}
.is-sliding .search-cell::before {
  background: rgb(var(--md-sys-color-surface-container-highest));
}
.is-sliding .has-filter::before {
  background: rgb(var(--md-sys-color-secondary-container));
}
.is-sliding .filter-cell > :deep(span) {
  position: relative;
  z-index: 3;
  color: white;
  mix-blend-mode: difference;
}
.is-sliding .filter-cell .filter-count {
  border-color: currentColor;
  background: transparent;
  color: inherit;
}
.filter-sheet :deep(button) {
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 160ms ease;
}
.count-enter-active,
.count-leave-active {
  transition:
    opacity 140ms ease,
    scale 180ms ease;
}
.count-enter-from,
.count-leave-to {
  opacity: 0;
  scale: 0.65;
}
.count-value {
  display: inline-block;
  animation: count-in 180ms ease-out;
}
@keyframes count-in {
  from {
    transform: translateY(0.2em);
    opacity: 0;
  }
}
.filter-reset {
  width: 2.5rem;
}
.reset-enter-active,
.reset-leave-active {
  transition:
    width 240ms var(--filter-ease),
    opacity 160ms ease;
}
.reset-enter-from,
.reset-leave-to {
  width: 0;
  opacity: 0;
}
@container (max-width: 27rem) {
  .sheet-reveal {
    border-radius: 1.8125rem;
  }
  .filter-cell {
    height: 2.875rem;
    flex: 1 1 0;
    flex-direction: column;
    gap: 0.125rem;
    padding: 0;
    font-size: 0.6875rem;
    line-height: 1rem;
  }
  .filter-count {
    position: absolute;
    top: 0;
    left: 52%;
    font-size: 0.625rem;
    line-height: 0.875rem;
    padding-inline: 0.25rem;
  }
}
@container (max-width: 18rem) {
  .filter-bar {
    gap: 1px;
    padding-inline: 3px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ews-filter-pill,
  .filter-sheet :deep(button) {
    transition: none;
  }
  .count-value {
    animation: none;
  }
}
</style>
