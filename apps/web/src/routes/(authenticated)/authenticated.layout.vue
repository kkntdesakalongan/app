<script setup lang="ts">
import { nextTick, ref } from 'vue'
import Sidebar from '@/components/navigations/sidebar/rail/Sidebar.vue'
import NavigationDrawer from '@/components/navigations/sidebar/drawer/NavigationDrawer.vue'
import AppRouterView from '@/components/routing/AppRouterView.vue'
import GlobalToolbar from '@/components/navigations/GlobalToolbar.vue'
import config from '@/config'
import Logo from '@/assets/corporate/common/Logo.vue'

const mobileNavigationOpen = ref(false)
function closeMobileNavigation() {
  mobileNavigationOpen.value = false
  void nextTick(() => document.querySelector<HTMLButtonElement>('[data-mobile-menu-trigger]')?.focus())
}
</script>

<template>
  <div
    class="relative grid min-h-screen w-full grid-cols-1 grid-rows-[auto_1fr] bg-surface-container-low text-on-surface lg:h-screen lg:grid-cols-[17rem_minmax(0,1fr)] lg:grid-rows-[var(--app-toolbar-height)_minmax(0,1fr)]"
    style="--app-toolbar-height: 3.5rem"
  >
    <div class="relative z-[2] hidden h-full items-center gap-3 overflow-hidden px-5 lg:col-start-1 lg:row-start-1 lg:flex">
      <Logo class="size-8 shrink-0" />
      <span class="truncate text-sm font-semibold tracking-[-0.01em]">{{ config.name }}</span>
    </div>
    <GlobalToolbar class="lg:col-start-2 lg:row-start-1" @open-navigation="mobileNavigationOpen = true" />
    <Sidebar class="lg:col-start-1 lg:row-start-1 lg:row-end-3" />
    <NavigationDrawer :open="mobileNavigationOpen" @close="closeMobileNavigation" />
    <main
      class="relative col-start-1 row-start-2 flex min-h-0 min-w-0 flex-col gap-2 overflow-x-hidden overflow-y-auto bg-surface-container-lowest p-4 sm:p-6 lg:absolute lg:bottom-4 lg:col-end-3 lg:col-start-1 lg:left-[17rem] lg:right-4 lg:row-end-3 lg:row-start-1 lg:top-[var(--app-toolbar-height)] lg:rounded-2xl lg:border lg:border-outline-variant lg:p-8 lg:shadow-[0_18px_50px_-24px_rgb(var(--md-sys-color-shadow)/0.42)]"
    >
      <AppRouterView />
    </main>
  </div>
</template>
