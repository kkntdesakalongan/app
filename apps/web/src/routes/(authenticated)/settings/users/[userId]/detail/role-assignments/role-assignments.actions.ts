import type { CollectionLoadContext, CollectionResult } from '@southneuhof/loom'
import { parseHonoResponse } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { roleAssignmentRecordSchema, roleAssignmentsQuerySchema, type RoleAssignment } from './role-assignments.schema'

type ListEndpoint = (typeof rpc.users)[':userId']['role-assignments']['$get']

async function list({ query, searchParameters, signal }: CollectionLoadContext): Promise<CollectionResult<RoleAssignment>> {
  const userId = String(searchParameters.userId ?? '')
  if (!userId) return { data: [] }
  const payload = await parseHonoResponse<ListEndpoint>(await rpc.users[':userId']['role-assignments'].$get({ param: { userId }, query: {} }, { init: { signal } }))
  const parsedQuery = roleAssignmentsQuerySchema.parse(query)
  const search = String(parsedQuery.search ?? '')
    .trim()
    .toLowerCase()
  const data = payload.data
    .map((record) => roleAssignmentRecordSchema.parse(record))
    .filter(
      (row) =>
        !search ||
        [row.roleCode, row.name, row.description].some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(search)
        )
    )
  return { data, meta: { total: data.length } }
}

async function set(userId: string, roleId: string, assigned: boolean): Promise<RoleAssignment[]> {
  const route = rpc.users[':userId']['role-assignments'][':roleId']
  const request = { param: { userId, roleId } }
  if (assigned) return (await parseHonoResponse<typeof route.$put>(await route.$put(request))).data.map((record) => roleAssignmentRecordSchema.parse(record))
  return (await parseHonoResponse<typeof route.$delete>(await route.$delete(request))).data.map((record) => roleAssignmentRecordSchema.parse(record))
}

export const roleAssignmentsActions = { list, set }
