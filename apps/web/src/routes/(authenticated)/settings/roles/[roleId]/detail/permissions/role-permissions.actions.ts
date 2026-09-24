import type { CollectionLoadContext, CollectionResult } from '@southneuhof/loom'
import { parseHonoResponse } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { rolePermissionRecordSchema, rolePermissionsQuerySchema, type RolePermission } from './role-permissions.schema'

type ListEndpoint = (typeof rpc.roles)[':roleId']['permissions']['$get']

function positiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

async function list({ query, searchParameters, signal }: CollectionLoadContext): Promise<CollectionResult<RolePermission>> {
  const roleId = String(searchParameters.role_id ?? '')
  if (!roleId) return { data: [] }
  const parsedQuery = rolePermissionsQuerySchema.parse(query)
  const wireQuery = Object.fromEntries(
    Object.entries(parsedQuery)
      .filter(([, value]) => value != null && value !== '')
      .map(([key, value]) => [key, String(value)])
  )
  const payload = await parseHonoResponse<ListEndpoint>(await rpc.roles[':roleId'].permissions.$get({ param: { roleId }, query: wireQuery }, { init: { signal } }))
  const data = payload.data.map((record) => rolePermissionRecordSchema.parse(record))
  const total = typeof payload.total === 'number' ? payload.total : data.length
  const page = positiveInt(parsedQuery.page, 1)
  const pageSize = positiveInt(parsedQuery.limit, 10)
  const totalPage = Math.ceil(total / pageSize)
  return { data, meta: { total, page, pageSize, totalPage } }
}

async function set(roleId: string, permissionId: string, assigned: boolean): Promise<RolePermission> {
  const route = rpc.roles[':roleId'].permissions[':permissionId']
  const request = { param: { roleId, permissionId } }
  if (assigned) return rolePermissionRecordSchema.parse((await parseHonoResponse<typeof route.$put>(await route.$put(request))).data)
  return rolePermissionRecordSchema.parse((await parseHonoResponse<typeof route.$delete>(await route.$delete(request))).data)
}

export const rolePermissionsActions = { list, set }
