<script setup lang="ts">
import { useRoute } from 'vue-router'
import { DetailView } from '@southneuhof/loom'
import ImagePreview from '@southneuhof/loom/components/base/ImagePreview.vue'
import { resource } from '../disaster-reports.resource'
const route = useRoute('disaster-reports-detail')
</script>
<template>
  <DetailView v-bind="resource.detail({ id: String(route.params.id) })" title="Disaster report">
    <template #value:image="{ value }">
      <ImagePreview v-if="typeof value === 'string'" :image-u-r-l="value" :thumbnail-u-r-l="value" class="h-40 w-40" />
      <span v-else>-</span>
    </template>
  </DetailView>
</template>
