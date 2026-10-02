<script setup lang="ts">
import Button from '@southneuhof/loom/components/base/Button.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import { RouterLink } from 'vue-router'
definePage({ path: '/:path(.*)' })
</script>

<template>
  <main class="flex min-h-screen w-screen items-center justify-center bg-background p-8 text-on-surface">
    <div class="flex flex-col items-center gap-4 text-center">
      <p class="text-sm font-semibold uppercase tracking-wide text-muted">404</p>
      <h1 class="text-3xl font-semibold">Page Not Found</h1>
      <p class="text-muted">The page you’re looking for doesn’t exist or may have moved.</p>
      <RouterLink to="/">
        <Button>
          Return to the home page
          <template #icon>
            <Icon name="home" class="ml-2" />
          </template>
        </Button>
      </RouterLink>
    </div>
  </main>
</template>
