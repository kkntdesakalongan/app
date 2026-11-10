<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { AnimatePresence, MotionConfig, motion, useReducedMotion, type $Transition } from 'motion-v'
import { DialogClose, DialogContent, DialogDescription, DialogPortal, DialogRoot, DialogTitle, DialogTrigger } from 'reka-ui'
import { activeNavigationEntry, visibleNavigation } from '@/manifest'
import { allowsPermission } from '@/framework/adapters/bundle'
import Button from '@southneuhof/loom/components/base/Button.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import ProfileSegment from './layouts/ProfileSegment.vue'
import Logo from '@/assets/corporate/common/Logo.vue'
import { routeBreadcrumbs } from './breadcrumbs'

const MotionDiv = motion.div
const MotionPath = motion.path
const route = useRoute()
const router = useRouter()
const open = ref(false)
const wide = useBreakpoints(breakpointsTailwind).greaterOrEqual('lg')
const reducedMotion = useReducedMotion()
const navigation = computed(() => visibleNavigation(allowsPermission))
const current = computed(() => activeNavigationEntry(route.path, (to) => router.resolve(to), navigation.value))
const breadcrumbs = computed(() => routeBreadcrumbs(route, router, navigation.value))
const currentLabel = computed(() => current.value?.entry.title ?? breadcrumbs.value.at(-1)?.label ?? 'Navigation')
const currentIcon = computed(() => current.value?.entry.icon ?? 'menu')
const transition = computed<$Transition>(() => (reducedMotion.value ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38, mass: 0.85 }))

async function restoreFocus(event: Event) {
  event.preventDefault()
  await nextTick()
  const target = wide.value ? document.querySelector('main') : document.querySelector<HTMLButtonElement>('#mobile-navigation-controls button')
  target?.focus({ preventScroll: true })
}

watch([() => route.fullPath, wide], () => {
  open.value = false
})
</script>

<template>
  <MotionConfig reduced-motion="user">
    <DialogRoot v-model:open="open">
      <DialogPortal force-mount>
        <AnimatePresence>
          <MotionDiv
            v-if="open"
            key="backdrop"
            class="fixed inset-0 z-[8] bg-scrim/[38%] lg:hidden"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: 1 }"
            :exit="{ opacity: 0 }"
            :transition="{ duration: reducedMotion ? 0 : 0.18 }"
            aria-hidden="true"
          />
        </AnimatePresence>
        <MotionDiv class="mobile-navigation text-on-surface lg:hidden" layout-root :class="{ 'is-open': open }">
          <MotionDiv
            class="navigation-surface bg-surface-container shadow-xl"
            :style="{ width: open ? 'var(--mobile-navigation-width)' : '100%', height: open ? 'var(--mobile-navigation-height)' : '56px', borderRadius: '28px' }"
            :transition="transition"
          >
            <MotionDiv class="navigation-label moving-navigation-label" aria-hidden="true" layout="position" :layout-dependency="open" :transition="transition">
              <Icon :name="currentIcon" class="shrink-0 text-on-surface-variant" /><span>{{ currentLabel }}</span>
            </MotionDiv>
            <Transition name="mobile-menu-content" :duration="reducedMotion ? 0 : { enter: 250, leave: 120 }">
              <DialogContent v-if="open" key="navigation" as-child @close-auto-focus="restoreFocus">
                <div class="navigation-content">
                  <div class="window-body">
                    <DialogTitle class="sr-only">Menu</DialogTitle>
                    <DialogDescription class="sr-only">Menu links</DialogDescription>
                    <div class="flex flex-row items-center justify-between gap-3 border-b border-outline-variant px-6 pb-4 pt-6">
                      <Logo class="size-6 shrink-0" />
                      <span class="min-w-0 truncate text-sm font-semibold tracking-[-0.01em]">Information System</span>
                    </div>
                    <nav aria-label="Mobile navigation" class="menu-list space-y-5 px-3 py-4">
                      <section v-for="module in navigation" :key="module.name">
                        <h3 class="mb-2 flex items-center gap-2 px-3 text-xs font-medium text-on-surface-variant">
                          <span aria-hidden="true" class="inline-flex"><Icon :name="module.icon" size="sm" /></span>{{ module.title }}
                        </h3>
                        <template v-for="entry in module.routes" :key="entry.name">
                          <p v-if="'separator' in entry" class="px-3 pb-1 pt-3 text-xs text-on-surface-variant">{{ entry.name }}</p>
                          <RouterLink
                            v-else
                            :to="entry.to"
                            class="overlay flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            :class="
                              current?.entry.name === entry.name
                                ? 'bg-primary-container font-medium text-on-primary-container after:bg-on-primary-container-hover focus-visible:after:bg-on-primary-container-active active:after:bg-on-primary-container-active'
                                : 'text-on-surface after:bg-on-surface-hover focus-visible:after:bg-on-surface-active active:after:bg-on-surface-active'
                            "
                            :aria-current="current?.entry.name === entry.name ? (route.name === entry.name ? 'page' : 'location') : undefined"
                            @click="open = false"
                          >
                            <span aria-hidden="true" class="inline-flex shrink-0"><Icon :name="entry.icon" /></span><span class="min-w-0 flex-1 truncate">{{ entry.title }}</span>
                            <span v-if="current?.entry.name === entry.name" aria-hidden="true" class="inline-flex"><Icon name="check" size="sm" /></span>
                          </RouterLink>
                        </template>
                      </section>
                    </nav>
                    <div class="mx-3 mb-4 mt-auto border-t border-outline-variant pt-3"><ProfileSegment /></div>
                  </div>
                  <div class="window-footer border-t border-outline-variant">
                    <span class="sr-only">Current menu: {{ currentLabel }}</span>
                    <DialogClose as-child><Button kind="icon" variant="tonal" type="button" ariaLabel="Close navigation" class="h-12 w-12 min-w-12" /></DialogClose>
                  </div>
                </div>
              </DialogContent>
            </Transition>
          </MotionDiv>
          <div id="mobile-navigation-controls" class="pill-controls" :aria-hidden="open" :inert="open">
            <span class="sr-only">Current menu: {{ currentLabel }}</span>
            <span class="navigation-label invisible" aria-hidden="true"
              ><Icon :name="currentIcon" class="shrink-0" /><span>{{ currentLabel }}</span></span
            >
            <DialogTrigger as-child>
              <Button kind="icon" variant="tonal" type="button" ariaLabel="Open navigation" class="h-12 w-12 min-w-12" />
            </DialogTrigger>
          </div>
          <span class="navigation-icon text-on-secondary-container" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" focusable="false">
              <MotionPath :initial="false" :animate="{ d: open ? 'M 6 6 L 18 18' : 'M 4 6 L 20 6' }" :transition="transition" />
              <MotionPath :initial="false" :animate="{ d: open ? 'M 12 12 L 12 12' : 'M 4 12 L 20 12', opacity: open ? 0 : 1 }" :transition="transition" />
              <MotionPath :initial="false" :animate="{ d: open ? 'M 6 18 L 18 6' : 'M 4 18 L 20 18' }" :transition="transition" />
            </svg>
          </span>
        </MotionDiv>
      </DialogPortal>
    </DialogRoot>
  </MotionConfig>
</template>

<style scoped>
.mobile-navigation {
  --mobile-navigation-width: min(22.5rem, calc(100vw - 2rem));
  --mobile-navigation-height: min(39.75rem, calc(100dvh - 5rem - env(safe-area-inset-bottom) - env(safe-area-inset-top)));
  position: fixed;
  z-index: 9;
  right: max(1rem, env(safe-area-inset-right));
  bottom: calc(1rem + env(safe-area-inset-bottom));
}
.navigation-surface {
  position: absolute;
  right: 0;
  bottom: 0;
  overflow: hidden;
  transition:
    width 360ms cubic-bezier(0.22, 1, 0.36, 1),
    height 360ms cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: bottom right;
  pointer-events: none;
}
.navigation-label {
  @apply flex items-center gap-2 pl-3 pr-4 text-sm font-medium;
  min-width: 0;
  white-space: nowrap;
  user-select: none;
}
.navigation-label > span {
  max-width: min(11.25rem, calc(100vw - 9rem));
  overflow: hidden;
  text-overflow: ellipsis;
}
.moving-navigation-label {
  position: absolute;
  bottom: 0;
  left: 4px;
  height: 56px;
}
.pill-controls {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: max-content;
  height: 56px;
  padding: 4px;
  pointer-events: auto;
}
.mobile-navigation.is-open .pill-controls {
  visibility: hidden;
}
.navigation-content {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  width: var(--mobile-navigation-width);
  height: var(--mobile-navigation-height);
  overflow: hidden;
  border-radius: 28px;
  outline: none;
  pointer-events: auto;
}
.mobile-navigation:not(.is-open) .navigation-content {
  pointer-events: none;
}
.window-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.window-body > * {
  flex-shrink: 0;
}
.window-body > .menu-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.window-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  min-height: 56px;
  padding: 4px;
}
.navigation-icon {
  position: absolute;
  right: 4px;
  bottom: 4px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  pointer-events: none;
}
.navigation-icon svg {
  width: 24px;
  height: 24px;
}
.mobile-menu-content-enter-active {
  transition: opacity 140ms ease 110ms;
}
.mobile-menu-content-leave-active {
  transition: opacity 120ms ease;
}
.mobile-menu-content-enter-from,
.mobile-menu-content-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .navigation-surface {
    transition-duration: 0ms;
  }
  .mobile-menu-content-enter-active,
  .mobile-menu-content-leave-active {
    transition-duration: 0ms;
    transition-delay: 0ms;
  }
}
</style>
