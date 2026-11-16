import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod'
import { z } from 'zod/v4'
import { reportCategories } from './report-categories.table'

export const reportCategoriesCreateSchema = createInsertSchema(reportCategories)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({ name: z.string().trim().min(1).max(255) })
export const reportCategoriesUpdateSchema = reportCategoriesCreateSchema
export const reportCategoriesSelectSchema = createSelectSchema(reportCategories)
