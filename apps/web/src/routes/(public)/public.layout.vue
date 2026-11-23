<script setup lang="ts">
import LoginBackground from '@/assets/app/login/login-background.svg'
import AppRouterView from '@/components/routing/AppRouterView.vue'
</script>

<template>
  <div class="flex min-h-[var(--app-content-height)] w-full items-center justify-center bg-cover bg-center p-4 sm:p-8" :style="{ backgroundImage: `url(${LoginBackground})` }">
    <div v-bind="{ 'data-public-layout-content': true }" class="w-full max-w-screen-sm"><AppRouterView /></div>
  </div>
</template>
