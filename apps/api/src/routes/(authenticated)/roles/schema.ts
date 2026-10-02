import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { roles } from './roles.table'

const write = { id: true, createdByUserId: true, updatedByUserId: true, createdAt: true, updatedAt: true } as const

export const roleCreateSchema = createInsertSchema(roles).omit(write)
export const roleUpdateSchema = createUpdateSchema(roles).omit(write)
export const roleSelectSchema = createSelectSchema(roles)
