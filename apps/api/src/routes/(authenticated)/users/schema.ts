import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-orm/zod'
import { z } from 'zod/v4'
import { users } from './users.table'

export const userStatusCodeSchema = z.enum(['active', 'non_active', 'expired', 'expiring_soon'])
export type UserStatusCode = z.infer<typeof userStatusCodeSchema>

export const userCreateSchema = createInsertSchema(users).omit({
  id: true,
  emailVerified: true,
  image: true,
  createdAt: true,
  updatedAt: true,
}).extend({ statusCode: userStatusCodeSchema.optional() })

export const userUpdateSchema = createUpdateSchema(users).omit({
  id: true,
  email: true,
  emailVerified: true,
  image: true,
  createdAt: true,
  updatedAt: true,
}).extend({ statusCode: userStatusCodeSchema.optional() })

export const userSelectSchema = createSelectSchema(users).extend({ statusCode: userStatusCodeSchema })

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  roleIds: z.array(z.string().trim().min(1)).min(1).superRefine((ids, context) => {
    if (new Set(ids).size !== ids.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Roles must be unique.' })
  }),
})

export type CreateUserInput = z.input<typeof createUserSchema>
