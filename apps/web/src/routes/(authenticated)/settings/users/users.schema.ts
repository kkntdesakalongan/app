import { createUserSchema } from '@southneuhof/api/routes/(authenticated)/users/users.create.contract'
import { user } from '@southneuhof/api/routes/(authenticated)/users/users.entity'
import { z } from 'zod/v4'
import { rpc } from '@/framework/rpc'
import { checkedHonoCreateSchema, checkedHonoQuerySchema, checkedHonoRecordSchema, checkedHonoUpdateSchema } from '@/framework/schema'

const roleSelection = z.union([z.string().trim().min(1), z.object({ id: z.string().trim().min(1) }).transform(({ id }) => id)])

export const createUserFormSchema = checkedHonoCreateSchema(
  rpc.users,
  createUserSchema.extend({
    roleIds: z
      .array(roleSelection)
      .min(1)
      .superRefine((ids, context) => {
        if (new Set(ids).size !== ids.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Roles must be unique.' })
      }),
  })
)

export const userRecordSchema = checkedHonoRecordSchema(rpc.users, user.schemas.select)
export const userUpdateFormSchema = checkedHonoUpdateSchema(rpc.users, user.schemas.update)
export const usersQuerySchema = checkedHonoQuerySchema(
  rpc.users,
  z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
    statusCode: z.string().optional(),
  })
)

export const usersTableQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  sort_by: z.enum(['name', 'email']).optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  statusCode: z.string().optional(),
})
