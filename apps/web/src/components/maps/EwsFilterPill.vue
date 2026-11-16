<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { motion, useReducedMotion, type $Transition } from 'motion-v'
import Button from '@southneuhof/loom/components/base/Button.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import Popover from '@southneuhof/loom/components/base/Popover.vue'
import Tooltip from '@southneuhof/loom/components/base/Tooltip.vue'
import NumberInput from '@southneuhof/loom/components/inputs/NumberInput.vue'
import TextInput from '@southneuhof/loom/components/inputs/TextInput.vue'
import type { EwsStation } from './useEwsStations'
import type { EwsFilters, EwsReadingFilter, EwsRange } from './ewsFilters'

const MotionDiv = motion.div
const reducedMotion = useReducedMotion()
const transition = computed<$Transition>(() => (reducedMotion.value ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38 }))
const filters = defineModel<EwsFilters>({ default: () => ({}) })
const openFilter = ref('')
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
const activeCount = computed(
  () => Number(types.value.length > 0) + Number(statuses.value.length > 0) + Number(Boolean(filters.value.search)) + ranges.filter((range) => filters.value[range.key]).length
)

function toggleType(type: EwsStation['type']) {
  types.value = types.value.includes(type) ? types.value.filter((value) => value !== type) : [...types.value, type]
  if (tsunamiOnly.value) statuses.value = statuses.value.filter((value) => value !== 'warning')
}
function toggleStatus(status: EwsStation['statusCode']) {
  if (tsunamiOnly.value && status === 'warning') return
  statuses.value = statuses.value.includes(status) ? statuses.value.filter((value) => value !== status) : [...statuses.value, status]
}
function rangeLabel(key: EwsReadingFilter, unit: string) {
  const range = filters.value[key]
  if (!range) return ''
  if (range.min !== undefined && range.max !== undefined) return `${range.min}–${range.max} ${unit}`
  return range.min !== undefined ? `≥ ${range.min} ${unit}` : `≤ ${range.max} ${unit}`
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
  openFilter.value = ''
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
  <MotionDiv
    layout
    :transition="transition"
    class="ews-filter-pill flex min-w-0 max-w-full items-center rounded-full bg-surface-container p-1.5 text-on-surface shadow-lg"
    role="group"
    aria-label="Early warning filters"
  >
    <MotionDiv layout="position" :transition="transition" class="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full">
      <Popover :model-value="openFilter === 'type'" side="top" align="center" :side-offset="12" content-class="bg-surface-container w-64 gap-3" @update:model-value="openFilter = $event ? 'type' : ''">
        <template #trigger>
          <Button
            type="button"
            :variant="types.length ? 'tonal' : 'text'"
            class="shrink-0 px-3"
            :ariaLabel="`Station type: ${types.length ? types.map((type) => typeOptions.find((option) => option.value === type)?.label).join(', ') : 'All'}`"
          >
            <template #icon><Icon name="broadcast" size="lg" /></template>
            <span
              >Type<span v-if="types.length" class="ml-1 tabular-nums">· {{ types.length }}</span></span
            >
          </Button>
        </template>
        <template #content>
          <h2 class="text-sm font-semibold">Station type</h2>
          <p class="text-xs text-on-surface-variant">No selection includes all types.</p>
          <Button
            v-for="option in typeOptions"
            :key="option.value"
            type="button"
            toggle
            :selected="types.includes(option.value)"
            v-bind="{ role: 'checkbox', 'aria-checked': types.includes(option.value) }"
            :variant="types.includes(option.value) ? 'tonal' : 'text'"
            class="w-full justify-start px-3"
            @update:selected="toggleType(option.value)"
          >
            <template #icon><Icon :name="types.includes(option.value) ? 'checkbox-circle' : 'checkbox-blank-circle'" size="lg" /></template>
            {{ option.label }}
          </Button>
        </template>
      </Popover>
      <Popover
        :model-value="openFilter === 'status'"
        side="top"
        align="center"
        :side-offset="12"
        content-class="bg-surface-container w-64 gap-3"
        @update:model-value="openFilter = $event ? 'status' : ''"
      >
        <template #trigger>
          <Button
            type="button"
            :variant="statuses.length ? 'tonal' : 'text'"
            class="shrink-0 px-3"
            :ariaLabel="`Status: ${statuses.length ? statuses.map((status) => statusOptions.find((option) => option.value === status)?.label).join(', ') : 'All'}`"
          >
            <template #icon><Icon name="alarm-warning" size="lg" /></template>
            <span
              >Status<span v-if="statuses.length" class="ml-1 tabular-nums">· {{ statuses.length }}</span></span
            >
          </Button>
        </template>
        <template #content>
          <h2 class="text-sm font-semibold">Station status</h2>
          <p class="text-xs text-on-surface-variant">No selection includes all states.</p>
          <Button
            v-for="option in statusOptions"
            :key="option.value"
            type="button"
            toggle
            :selected="statuses.includes(option.value)"
            v-bind="{ role: 'checkbox', 'aria-checked': statuses.includes(option.value) }"
            :variant="statuses.includes(option.value) ? 'tonal' : 'text'"
            :disabled="tsunamiOnly && option.value === 'warning'"
            class="w-full justify-start px-3"
            @update:selected="toggleStatus(option.value)"
          >
            <template #icon><Icon :name="statuses.includes(option.value) ? 'checkbox-circle' : 'checkbox-blank-circle'" size="lg" /></template>
            {{ option.label }}
          </Button>
          <p v-if="tsunamiOnly" class="text-xs text-on-surface-variant">Tsunami stations have no danger state.</p>
        </template>
      </Popover>
      <Popover
        :model-value="openFilter === 'search'"
        side="top"
        align="center"
        :side-offset="12"
        content-class="bg-surface-container w-72 gap-3"
        @update:model-value="openFilter = $event ? 'search' : ''"
      >
        <template #trigger>
          <Button type="button" :variant="filters.search ? 'tonal' : 'text'" class="shrink-0 px-3" :ariaLabel="`Station name: ${filters.search || 'All'}`">
            <template #icon><Icon name="search" size="lg" /></template>
            <span class="max-w-28 truncate">{{ filters.search || 'Name' }}</span>
          </Button>
        </template>
        <template #content>
          <h2 class="text-sm font-semibold">Station name</h2>
          <TextInput :model-value="search" label="Search stations" placeholder="Station name" @update:model-value="search = String($event ?? '')" />
        </template>
      </Popover>
      <Popover
        v-for="range in ranges"
        :key="range.key"
        :model-value="openFilter === range.key"
        side="top"
        align="center"
        :side-offset="12"
        content-class="bg-surface-container w-80 max-w-[calc(100vw_-_2rem)] gap-3"
        @update:model-value="openFilter = $event ? range.key : ''"
      >
        <template #trigger>
          <Button type="button" :variant="filters[range.key] ? 'tonal' : 'text'" class="shrink-0 px-3" :ariaLabel="`${range.label}: ${rangeLabel(range.key, range.unit) || 'Any'}`">
            <template #icon><Icon :name="range.icon" size="lg" /></template>
            <span
              >{{ range.label }}<span v-if="filters[range.key]" class="ml-1 tabular-nums">· {{ rangeLabel(range.key, range.unit) }}</span></span
            >
          </Button>
        </template>
        <template #content>
          <h2 class="text-sm font-semibold">{{ range.label }}</h2>
          <div class="grid grid-cols-2 gap-2">
            <NumberInput v-model="range.min" label="Minimum" :suffix="range.unit" />
            <NumberInput v-model="range.max" label="Maximum" :suffix="range.unit" />
          </div>
          <p v-if="range.min != null && range.max != null && range.min > range.max" role="alert" class="text-xs text-error">Minimum cannot exceed maximum. The last valid range stays active.</p>
          <p v-else class="text-xs text-on-surface-variant">Leave either bound empty for an open range.</p>
        </template>
      </Popover>
    </MotionDiv>
    <Transition name="filter-reset">
      <div v-if="activeCount" class="filter-reset flex shrink-0 items-center overflow-hidden">
        <span aria-hidden="true" class="mx-1 h-5 w-px bg-outline-variant" />
        <Tooltip>
          <template #trigger>
            <Button type="button" kind="icon" variant="tonal" :ariaLabel="`Reset ${activeCount} active filters`" @click="reset">
              <template #icon><Icon name="filter-off" /></template>
            </Button>
          </template>
          <template #content>Reset filters</template>
        </Tooltip>
      </div>
    </Transition>
  </MotionDiv>
</template>

<style scoped>
.ews-filter-pill :deep(button) {
  transition:
    background-color 180ms ease-out,
    color 180ms ease-out;
}
.filter-reset-enter-active,
.filter-reset-leave-active {
  transition:
    width 220ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 160ms ease-out,
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
.filter-reset-enter-from,
.filter-reset-leave-to {
  width: 0;
  opacity: 0;
  transform: scale(0.8);
}
.filter-reset-enter-to,
.filter-reset-leave-from {
  width: 50px;
  opacity: 1;
  transform: scale(1);
}
@media (prefers-reduced-motion: reduce) {
  .ews-filter-pill :deep(button),
  .filter-reset-enter-active,
  .filter-reset-leave-active {
    transition: none;
  }
}
</style>
