import { z } from 'zod/v4'
import { rpc } from '@/framework/rpc'
import { checkedHonoResponseRecordSchema } from '@/framework/schema'

const endpoint = rpc.users[':userId']['role-assignments'].$get

export const roleAssignmentRecordSchema = checkedHonoResponseRecordSchema(
  endpoint,
  z.object({
    id: z.string(),
    roleCode: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    active: z.boolean(),
    assigned: z.boolean(),
  })
)

export const roleAssignmentsQuerySchema = z.object({ search: z.string().optional() })

export type RoleAssignment = z.output<typeof roleAssignmentRecordSchema>
