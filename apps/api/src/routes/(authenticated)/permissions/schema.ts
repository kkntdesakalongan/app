import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { permissions } from './permissions.table'

const write = { id: true, createdByUserId: true, updatedByUserId: true, createdAt: true, updatedAt: true } as const

export const permissionCreateSchema = createInsertSchema(permissions).omit(write)
export const permissionUpdateSchema = createUpdateSchema(permissions).omit(write)
export const permissionSelectSchema = createSelectSchema(permissions)
