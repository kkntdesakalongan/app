import { and, eq } from 'drizzle-orm'
import type { PermissionCode } from './authorization/catalog'
import { getDb } from './db'
import { permissions } from './routes/(authenticated)/permissions/permissions.table'
import {
  roleAssignments,
  roles,
  rolePermissions,
} from './routes/(authenticated)/roles/roles.table'
import { users } from './routes/(authenticated)/users/users.table'

export type OrgIdentity = {
  userId: string
  user: {
    id: string
    name: string
    email: string
    statusCode: string
  }
  roleCodes: string[]
  permissions: ReadonlySet<PermissionCode>
}

function activeGrantCondition(userId: string, permissionCode?: PermissionCode) {
  return and(
    eq(roleAssignments.userId, userId),
    eq(roleAssignments.active, true),
    eq(users.statusCode, 'active'),
    eq(roles.active, true),
    eq(rolePermissions.active, true),
    eq(permissions.active, true),
    permissionCode ? eq(permissions.permissionCode, permissionCode) : undefined,
  )
}

function grantQuery() {
  const db = getDb()
  return db
    .select({ permissionCode: permissions.permissionCode })
    .from(roleAssignments)
    .innerJoin(users, eq(users.id, roleAssignments.userId))
    .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
}

export async function resolveIdentity(userId: string): Promise<OrgIdentity | null> {
  const db = getDb()
  const profile = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      statusCode: users.statusCode,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const user = profile[0]
  if (!user || user.statusCode !== 'active') return null

  const activeRoles = await db
    .selectDistinct({ roleCode: roles.roleCode })
    .from(roleAssignments)
    .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
    .where(and(
      eq(roleAssignments.userId, userId),
      eq(roleAssignments.active, true),
      eq(roles.active, true),
    ))

  const granted = await grantQuery().where(activeGrantCondition(userId))
  return {
    userId,
    user,
    roleCodes: activeRoles.map(({ roleCode }) => roleCode),
    permissions: new Set(granted.map(({ permissionCode }) => permissionCode as PermissionCode)),
  }
}

export async function resolveEffectivePermissions(userId: string): Promise<ReadonlySet<PermissionCode>> {
  const identity = await resolveIdentity(userId)
  return identity?.permissions ?? new Set<PermissionCode>()
}

export async function can(userId: string, permissionCode: PermissionCode) {
  const rows = await grantQuery()
    .where(activeGrantCondition(userId, permissionCode))
    .limit(1)
  return Boolean(rows[0])
}
