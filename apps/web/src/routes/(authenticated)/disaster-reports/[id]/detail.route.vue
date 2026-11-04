<script setup lang="ts">
import { useRoute } from 'vue-router'
import { DetailView, Detail } from '@southneuhof/loom'
import { resource } from '../disaster-reports.resource'
const route = useRoute('disaster-reports-detail')
</script>
<template>
  <DetailView v-bind="resource.detail({ id: String(route.params.id) })" title="Disaster report">
    <template #body="{ record, detail }"
      ><Detail v-bind="detail" />
      <section v-if="record.image">
        <h2>Image</h2>
        <img :src="record.image" alt="Disaster report attachment" class="max-h-[32rem] max-w-full object-contain" /></section
    ></template>
  </DetailView>
</template>
