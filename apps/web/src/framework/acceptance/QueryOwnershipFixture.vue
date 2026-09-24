<script setup lang="ts">
import { ref } from 'vue'
import { defineForm, defineResource, defineTable, Form, Table } from '@southneuhof/loom'
import { z } from 'zod/v4'

type Row = {
  id: string
  name: string
  owner: string
  rel_owner_name: string
}

const rows: Row[] = [
  { id: '1', name: 'Pertama', owner: '', rel_owner_name: 'Budi' },
  { id: '2', name: 'Kedua', owner: '', rel_owner_name: 'Sari' },
]

const rowSchema = z.object({ id: z.string(), name: z.string(), owner: z.string(), rel_owner_name: z.string() })
const table = defineTable({
  schema: rowSchema,
  labels: { name: 'Nama', owner: 'Pemilik' },
  columns: {
    name: { sortable: true },
    owner: { read: (record: Row) => record.rel_owner_name },
  },
})

const alpha = defineResource({
  key: 'alpha',
  identity: (record: Row) => record.id,
  list: { permission: null, table: { ...table, load: async () => ({ data: rows, meta: { total: 40, pageSize: 10, totalPage: 4 } }) } },
})

const beta = defineResource({
  key: 'beta',
  identity: (record: Row) => record.id,
  list: { permission: null, table: { ...table, load: async () => ({ data: rows, meta: { total: 40, pageSize: 10, totalPage: 4 } }) } },
})

const offline = defineResource({
  key: 'offline',
  identity: (record: Row) => record.id,
  list: { permission: null, table: { ...table, load: () => ({ data: rows, meta: { total: 40, pageSize: 10, totalPage: 4 } }) } },
})

const alphaList = alpha.list
const alphaArchivedList = {
  ...alpha.list,
  table: { ...alpha.list.table, namespace: 'archived' },
}
const betaList = beta.list
const offlineList = offline.list
const localQuery = ref<Record<string, unknown>>({ page: 1, limit: 10 })
const localLoad = () => ({ data: rows, meta: { total: 40, pageSize: 10, totalPage: 4 } })

const draftSchema = z.object({ kind: z.string().optional(), reason: z.string().optional() })
const draftForm = defineForm({
  schema: draftSchema,
  fields: {
    kind: { label: 'Jenis', renderer: 'text' },
    reason: { label: 'Alasan', behavior: { visible: ({ draft }) => draft.kind === 'lain' } },
  },
  submit: (draft) => draft,
})
const submitted = ref<z.output<typeof draftSchema>>()
</script>

<template>
  <div>
    <section id="fixture-two-resources">
      <Table v-bind="alphaList.table" />
      <Table v-bind="betaList.table" />
    </section>

    <section id="fixture-duplicate-resource">
      <Table v-bind="alphaList.table" />
      <Table v-bind="alphaArchivedList.table" />
    </section>

    <section id="fixture-offline">
      <Table v-bind="offlineList.table" />
    </section>

    <section id="fixture-local-query">
      <Table v-bind="table" :load="localLoad" :query="localQuery" />
    </section>

    <section id="fixture-draft">
      <Form v-bind="draftForm" :initial-data="{ kind: 'biasa' }" @submitted="submitted = $event" />
    </section>
  </div>
</template>
