<script setup lang="ts">
import Sidebar from '@/components/navigations/sidebar/rail/Sidebar.vue'
import MobileNavigation from '@/components/navigations/MobileNavigation.vue'
import AppRouterView from '@/components/routing/AppRouterView.vue'
import GlobalToolbar from '@/components/navigations/GlobalToolbar.vue'
import Logo from '@/assets/corporate/common/Logo.vue'
</script>

<template>
  <div
    class="authenticated-shell relative grid h-[var(--app-content-height)] w-full grid-cols-1 grid-rows-[minmax(0,1fr)] bg-surface-container-low text-on-surface lg:grid-cols-[17rem_minmax(0,1fr)] lg:grid-rows-[var(--app-toolbar-height)_minmax(0,1fr)]"
    style="--app-toolbar-height: 3.5rem"
  >
    <div class="relative z-[2] hidden h-full items-center gap-3 overflow-hidden px-5 lg:col-start-1 lg:row-start-1 lg:flex">
      <Logo class="size-8 shrink-0" />
      <span class="truncate text-sm font-semibold tracking-[-0.01em]">Information System</span>
    </div>
    <GlobalToolbar class="lg:col-start-2 lg:row-start-1" />
    <Sidebar class="lg:col-start-1 lg:row-start-1 lg:row-end-3" />
    <MobileNavigation />
    <div class="col-start-1 row-start-1 min-h-0 min-w-0 max-h-full overflow-x-hidden overflow-y-auto bg-surface-container-lowest lg:contents">
      <main
        tabindex="-1"
        class="isolate min-h-0 min-w-0 bg-surface-container-lowest px-4 pt-4 sm:px-6 sm:pt-6 lg:absolute lg:bottom-4 lg:col-end-3 lg:col-start-1 lg:left-[17rem] lg:right-4 lg:row-end-3 lg:row-start-1 lg:top-[var(--app-toolbar-height)] lg:flex lg:flex-col lg:gap-2 lg:overflow-x-hidden lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-outline-variant lg:p-8 lg:shadow-[0_18px_50px_-24px_rgb(var(--md-sys-color-shadow)/0.42)]"
      >
        <AppRouterView>
          <template #after>
            <div aria-hidden="true" class="h-[var(--mobile-navigation-clearance)] shrink-0 lg:hidden" />
          </template>
        </AppRouterView>
      </main>
    </div>
  </div>
</template>
