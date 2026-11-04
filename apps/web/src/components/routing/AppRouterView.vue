<script setup lang="ts">
import { computed, inject, onBeforeUnmount, provide, unref } from 'vue'
import { RouterView, useRoute, useRouter, viewDepthKey } from 'vue-router'
import type { RouteNamedMap } from 'vue-router/auto-routes'
import Spinner from '@southneuhof/loom/components/base/Spinner.vue'
import { routeLeaveCleanup } from './routeTransition'
import { keyManager } from '@/stores/keyManager'

const parentCleanup = inject(routeLeaveCleanup, undefined)
const pendingCleanup = new Set<() => void>()
let disposing = false
provide(routeLeaveCleanup, (cleanup) => {
  if (disposing) {
    if (parentCleanup) parentCleanup(cleanup)
    else cleanup()
  } else pendingCleanup.add(cleanup)
})
function finishLeave() {
  const callbacks = [...pendingCleanup]
  pendingCleanup.clear()
  for (const cleanup of callbacks) cleanup()
}
onBeforeUnmount(() => {
  disposing = true
  const callbacks = [...pendingCleanup]
  pendingCleanup.clear()
  for (const cleanup of callbacks) {
    if (parentCleanup) parentCleanup(cleanup)
    else cleanup()
  }
})

const route = useRoute()
const router = useRouter()
const viewDepth = inject(viewDepthKey, 0)

const renderedRecord = computed(() => {
  let depth = unref(viewDepth)
  while (route.matched[depth] && !route.matched[depth].components) depth++
  return route.matched[depth]
})

const routeViewKey = computed(() => {
  const record = renderedRecord.value
  if (!record) return 'unmatched'
  if (record.name == null) {
    const params = [...record.path.matchAll(/:([A-Za-z0-9_]+)/g)].map(([, name]) => route.params[name])
    return `${record.path}:${JSON.stringify(params)}`
  }

  const name = String(record.name)
  const path = router.resolve({ name: record.name as keyof RouteNamedMap }).path
  return `${name}:${path}:${String(keyManager().value[name])}`
})
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="vfade" mode="out-in" appear @after-leave="finishLeave" @leave-cancelled="finishLeave">
      <div v-if="Component" :key="routeViewKey" :class="renderedRecord?.meta.fullBleed ? 'absolute inset-0 overflow-hidden' : undefined">
        <Suspense :timeout="0">
          <component :is="Component" />
          <template #fallback>
            <div class="flex items-center justify-center">
              <Spinner />
            </div>
          </template>
        </Suspense>
      </div>
      <div v-else-if="$slots.default" key="default">
        <slot />
      </div>
    </Transition>
  </RouterView>
</template>
