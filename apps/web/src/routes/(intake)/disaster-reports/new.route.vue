<script setup lang="ts">
import Button from '@southneuhof/loom/components/base/Button.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import logo from '@/assets/corporate/assets/app-logo.svg'
import { nextTick, ref } from 'vue'
import { defineForm, Form } from '@southneuhof/loom'
import { createHonoResourceActions } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { reportFormSchema, reportPayload } from '@/routes/(authenticated)/disaster-reports/report-form'
import { categoryField } from '@/routes/(authenticated)/master/report-categories/category-field'
const saved = ref(false)
const successHeading = ref<HTMLHeadingElement | null>(null)
async function showSuccess() {
  saved.value = true
  await nextTick()
  successHeading.value?.focus()
}
const api = createHonoResourceActions(rpc.public['disaster-reports'])
const form = defineForm({
  schema: reportFormSchema,
  fields: {
    title: { renderer: 'text', label: 'Judul laporan' },
    description: { renderer: 'textarea', label: 'Keterangan' },
    categoryId: categoryField,
    image: { renderer: 'image', label: 'Foto', props: { mode: 'file', maxSize: 5, accept: ['image/png', 'image/jpeg', 'image/webp'] } },
  },
  submit: async (value) => api.create(await reportPayload(value)),
})
</script>
<template>
  <section class="intake-report flex flex-col gap-6">
    <header v-if="!saved" class="flex items-center justify-between gap-4 border-b border-outline-variant pb-4">
      <h1 class="text-xl font-bold tracking-tight">Laporkan bencana</h1>
      <img :src="logo" class="size-10 shrink-0 object-contain" alt="Logo aplikasi" width="40" height="40" />
    </header>
    <section v-if="saved" class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <span class="flex size-24 items-center justify-center rounded-full bg-primary-container text-6xl text-on-primary-container" aria-hidden="true">
        <Icon name="check" size="6xl" />
      </span>
      <h1 ref="successHeading" tabindex="-1" class="text-2xl font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
        Laporan terkirim
      </h1>
      <p class="text-on-surface-variant">Laporan Anda berhasil disimpan.</p>
      <div class="intake-dock">
        <div class="intake-blur" aria-hidden="true">
          <div />
          <div />
          <div />
        </div>
        <div class="intake-actions mx-auto flex max-w-2xl flex-row items-center gap-2">
          <Button type="button" href="/map" class="min-w-0 flex-1">Kembali</Button>
        </div>
      </div>
    </section>
    <Form v-else v-bind="form" @submitted="showSuccess">
      <template #actions="actions">
        <div class="intake-dock">
          <div class="intake-blur" aria-hidden="true">
            <div />
            <div />
            <div />
          </div>
          <div class="intake-actions mx-auto flex max-w-2xl flex-row items-center gap-2">
            <Button type="button" kind="icon" variant="tonal" ariaLabel="Batal dan kembali ke peta" href="/map" :disabled="actions.submitPending">
              <template #icon><Icon name="arrow-left" /></template>
            </Button>
            <Button type="submit" class="min-w-0 flex-1" :disabled="actions.submitPending || actions.inputPending || actions.postWriteError !== undefined">
              {{ actions.submitting ? 'Mengirim…' : 'Kirim laporan' }}
            </Button>
          </div>
        </div>
      </template>
    </Form>
  </section>
</template>

<style scoped>
.intake-report {
  --intake-dock-height: calc(5rem + env(safe-area-inset-bottom, 0px));
  --intake-blur-height: calc(var(--intake-dock-height) + 4rem);
  min-height: calc(100svh - 2rem);
  padding-bottom: calc(var(--intake-blur-height) + 1.5rem);
}
.intake-dock {
  position: fixed;
  inset: auto 0 0;
  z-index: 20;
  height: var(--intake-dock-height);
  pointer-events: none;
}
.intake-actions {
  position: relative;
  padding: 1rem;
  box-sizing: content-box;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  pointer-events: auto;
}
.intake-blur,
.intake-blur > div {
  position: absolute;
  inset: auto 0 0;
  height: var(--intake-blur-height);
}
.intake-blur {
  background: linear-gradient(to top, rgb(var(--md-sys-color-surface-container-lowest) / 0.9), rgb(var(--md-sys-color-surface-container-lowest) / 0));
}
.intake-blur > div {
  inset: 0;
  height: auto;
  mask-image: linear-gradient(to top, black, transparent);
  backdrop-filter: blur(3px);
}
.intake-blur > div:nth-child(2) {
  top: 25%;
  backdrop-filter: blur(8px);
}
.intake-blur > div:nth-child(3) {
  top: 55%;
  backdrop-filter: blur(16px);
}
@media (min-width: 640px) {
  .intake-report {
    min-height: calc(100svh - 4rem);
  }
  .intake-actions {
    padding-inline: 2rem;
  }
}
@media (prefers-reduced-transparency: reduce) {
  .intake-blur {
    height: var(--intake-dock-height);
    background: rgb(var(--md-sys-color-surface-container-lowest));
  }
  .intake-blur > div {
    backdrop-filter: none;
  }
}
</style>
