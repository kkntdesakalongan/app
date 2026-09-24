import { user } from '@southneuhof/api/routes/(authenticated)/users/users.entity'
import type { z } from 'zod/v4'

export const usersRecordSchema = user.schemas.select
export const usersCreateSchema = user.schemas.create
export const usersUpdateSchema = user.schemas.update

export type User = z.output<typeof usersRecordSchema>
export type UserCreate = z.input<typeof usersCreateSchema>
export type UserUpdate = z.input<typeof usersUpdateSchema>
