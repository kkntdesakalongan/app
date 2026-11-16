import { createEntity } from '@southneuhof/sprindle/entity'
import { defineDomainPart } from '@southneuhof/sprindle/model'
import { reportCategories } from './report-categories.table'
import { reportCategoriesCreateSchema, reportCategoriesUpdateSchema, reportCategoriesSelectSchema } from './schema'
export const entity = createEntity({ table: reportCategories, schemas: { create: reportCategoriesCreateSchema, update: reportCategoriesUpdateSchema, select: reportCategoriesSelectSchema } })
export const domain = defineDomainPart({ tables: { reportCategories }, entities: [entity] })
