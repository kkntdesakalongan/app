<script setup lang="ts">
import Button from '@southneuhof/loom/components/base/Button.vue'
import { RouterLink } from 'vue-router'
import { ref } from 'vue'
import { defineForm, FormView } from '@southneuhof/loom'
import { createHonoResourceActions } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { reportFormSchema, reportPayload } from '@/routes/(authenticated)/disaster-reports/report-form'
const saved = ref(false)
const api = createHonoResourceActions(rpc.public['disaster-reports'])
const form = defineForm({
  schema: reportFormSchema,
  fields: {
    title: { renderer: 'text', label: 'Title' },
    description: { renderer: 'textarea', label: 'Description' },
    image: { renderer: 'image', label: 'Image', props: { mode: 'file', maxSize: 5, accept: ['image/png', 'image/jpeg', 'image/webp'] } },
  },
  submit: async (value) => api.create(await reportPayload(value)),
})
</script>
<template>
  <section v-if="saved" aria-live="polite" class="flex flex-col gap-2">
    <h1>Report submitted</h1>
    <p>Your disaster report was saved.</p>
    <Button type="button" @click="saved = false">Submit another report</Button><RouterLink to="/map">View map</RouterLink>
  </section>
  <FormView
    v-else
    :form="form"
    title="Report a disaster"
    :default-to="false"
    :after-submit="
      () => {
        saved = true
      }
    "
  />
</template>
