<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { useScreenStore } from '@/stores/screen'
import { debounce } from '@southneuhof/utilities/object'
import { computed, onMounted, onBeforeUnmount, onErrorCaptured, ref, watch } from 'vue'
import { useColorPreference } from './stores/colorpreference'
import { Toaster } from 'vue-sonner'
import config from './config'
import Button from '@southneuhof/loom/components/base/Button.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import Spinner from '@southneuhof/loom/components/base/Spinner.vue'
import { reloadPage } from './reload'
import { errorMessage as getErrorMessage } from './framework/adapters/data/normalize'
import { identityError, identityStatus } from './framework/identity'
import { setPageReadinessError } from '@southneuhof/loom'

const error = ref<Error | null>(null)
const identityFailed = computed(() => identityStatus.value === 'failed')
const displayedError = computed(() => getErrorMessage(error.value ?? identityError.value, 'Please reload the page and try again.'))
const router = useRouter()

watch(
  identityFailed,
  (failed) => {
    if (failed) setPageReadinessError()
  },
  { immediate: true }
)

function goBack() {
  const removeAfterEach = router.afterEach((_to, _from, failure) => {
    removeAfterEach()
    if (!failure) error.value = null
  })
  router.back()
}

onErrorCaptured((err, instance, info) => {
  console.error('App error:', err, instance, info)
  error.value = err
  setPageReadinessError(err)
  return false
})

const handleResize = debounce(useScreenStore().handleResize, 300)

onMounted(() => {
  window.addEventListener('resize', handleResize)
  useScreenStore().handleResize()
  document.title = config.name
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="text-black-text transition-colors">
    <Toaster position="bottom-center" richColors :theme="useColorPreference().value" />
    <div class="min-h-[var(--app-content-height)] w-full">
      <main v-if="error || identityFailed" class="flex min-h-[var(--app-content-height)] w-full items-center justify-center bg-background p-8 text-on-surface">
        <div class="flex flex-col items-center gap-4 text-center" role="alert" aria-live="assertive">
          <h1 class="text-3xl font-semibold">Something went wrong.</h1>
          <p class="max-w-2xl break-words text-muted">{{ displayedError }}</p>
          <div class="flex flex-row items-center gap-2">
            <Button type="button" @click="goBack" variant="text">
              Go Back
              <template #icon>
                <Icon name="arrow-left" class="ml-2" />
              </template>
            </Button>
            <Button type="button" @click="reloadPage">
              Reload
              <template #icon>
                <Icon name="refresh" class="ml-2" />
              </template>
            </Button>
          </div>
        </div>
      </main>
      <Suspense v-else :timeout="0">
        <RouterView />
        <template #fallback>
          <div class="flex min-h-[var(--app-content-height)] items-center justify-center">
            <Spinner />
          </div>
        </template>
      </Suspense>
    </div>
  </div>
</template>
