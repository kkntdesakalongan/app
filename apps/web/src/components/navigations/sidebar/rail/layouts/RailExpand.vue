<script setup lang="ts">
import { titleCase } from '@southneuhof/utilities/string'
import ProfileSegment from '../../../layouts/ProfileSegment.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import type { VisibleNavigationModule } from '@/manifest'

defineProps<{ menus?: VisibleNavigationModule }>()
</script>

<template>
  <div class="z-10 overflow-hidden rounded-r-2xl bg-surface-container text-on-surface -ml-2">
    <div class="sticky top-0 -z-10 flex h-screen min-w-[288px] max-w-[288px] flex-col justify-between gap-8 overflow-auto rounded-r-2xl p-8">
      <ProfileSegment v-if="!menus" />
      <div v-else class="rounded-xl">
        <div class="flex flex-col gap-8">
          <div class="text-2xl font-bold">{{ menus.title }}</div>
          <hr />
          <div class="flex flex-col gap-2">
            <div v-for="submenu in menus.routes" :key="submenu.name">
              <div v-if="'separator' in submenu" class="text-muted px-4 py-2 text-sm">{{ submenu.name }}</div>
              <button
                v-else-if="String($route.name) === submenu.name"
                class="overlay flex w-full flex-row items-center gap-4 rounded-full bg-primary p-4 text-on-primary after:bg-on-primary-hover focus-visible:after:bg-on-primary-active active:after:bg-on-primary-active"
              >
                <Icon :fill="true" :name="submenu.icon"></Icon>
                <div class="text-left">{{ titleCase(submenu.title) }}</div>
              </button>
              <button
                v-else
                @click="() => $router.push({ name: submenu.name } as never)"
                class="overlay flex w-full flex-row items-center gap-4 rounded-full p-4 text-on-surface after:bg-on-surface-hover focus-visible:after:bg-on-surface-active active:after:bg-on-surface-active"
              >
                <Icon :name="submenu.icon"></Icon>
                <div class="text-left">{{ titleCase(submenu.title) }}</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
