import { user } from '@southneuhof/api/routes/(authenticated)/users/users.entity'
import { z } from 'zod/v4'
import { collectionQueryFields } from '@/framework/hono/collectionQuery'

export const usersRecordSchema = user.schemas.select
export const usersCreateSchema = user.schemas.create
export const usersUpdateSchema = user.schemas.update
export const usersQuerySchema = z.object({
  ...collectionQueryFields,
  sort_by: z.enum(['name']).optional(),
})

export type User = z.output<typeof usersRecordSchema>
export type UserCreate = z.input<typeof usersCreateSchema>
export type UserUpdate = z.input<typeof usersUpdateSchema>
