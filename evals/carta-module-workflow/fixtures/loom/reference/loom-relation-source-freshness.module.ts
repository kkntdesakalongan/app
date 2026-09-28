import { z } from 'zod/v4'
import { defineForm, defineResource } from '@southneuhof/loom'
import {
  createServiceRequest,
  loadCategories,
  renameCategory,
  type Category,
  type ServiceRequest,
} from './loom-relation-source-freshness.services'

export const categoryResource = defineResource({
  key: 'loom-eval-categories',
  identity: (record: Pick<Category, 'id'>) => record.id,
  actions: {
    rename: {
      permission: null,
      run: renameCategory,
    },
  },
})

const requestForm = defineForm({
  schema: z.object({ categoryId: z.string().min(1), summary: z.string().min(1) }),
  labels: { categoryId: 'Category', summary: 'Summary' },
  fields: {
    categoryId: {
      renderer: 'select',
      props: {
        load: loadCategories,
        resource: categoryResource.key,
        pick: 'id',
        view: 'name',
        searchable: false,
      },
    },
    summary: { renderer: 'text' },
  },
  submit: createServiceRequest,
})

export const serviceRequestResource = defineResource({
  key: 'loom-eval-service-requests',
  identity: (record: Pick<ServiceRequest, 'id'>) => record.id,
  create: { permission: null, form: requestForm },
})
