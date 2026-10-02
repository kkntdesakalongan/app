import { defineRoute, HttpError, notFound } from '@southneuhof/sprindle'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../../../../db'
import { requireOrgIdentity, requirePermission } from '../../../../../../identity'
import { permissions } from '../../../../permissions/permissions.table'
import { rolePermissions, roles } from '../../../roles.table'

function now() {
  return new Date().toISOString()
}

async function rolePermissionState(roleId: string, permissionId: string) {
  const row = (await getDb()
    .select({
      id: permissions.id,
      permissionCode: permissions.permissionCode,
      name: permissions.name,
      description: permissions.description,
      assigned: rolePermissions.active,
    })
    .from(permissions)
    .leftJoin(rolePermissions, and(
      eq(rolePermissions.permissionId, permissions.id),
      eq(rolePermissions.roleId, roleId),
    ))
    .where(eq(permissions.id, permissionId))
    .limit(1))[0]
  if (!row) throw notFound()
  return { ...row, assigned: row.assigned === true }
}

async function setRolePermission(actorUserId: string, roleId: string, permissionId: string, active: boolean) {
  await getDb().transaction(async (tx) => {
    const foundRole = (await tx.select().from(roles).where(eq(roles.id, roleId)).limit(1))[0]
    const foundPermission = (await tx.select().from(permissions).where(eq(permissions.id, permissionId)).limit(1))[0]
    if (!foundRole || !foundPermission) throw notFound()
    if (active && !foundPermission.active) throw new HttpError(422, 'permission_inactive')
    const existing = (await tx.select().from(rolePermissions).where(and(
      eq(rolePermissions.roleId, roleId),
      eq(rolePermissions.permissionId, permissionId),
    )).limit(1))[0]
    if (existing?.active === active || (!existing && !active)) return
    if (existing) {
      await tx.update(rolePermissions).set({ active, updatedAt: now(), updatedByUserId: actorUserId }).where(and(
        eq(rolePermissions.roleId, roleId),
        eq(rolePermissions.permissionId, permissionId),
      ))
    } else {
      await tx.insert(rolePermissions).values({ roleId, permissionId, active, createdByUserId: actorUserId, updatedByUserId: actorUserId })
    }
  })
  return rolePermissionState(roleId, permissionId)
}

const change = (active: boolean) => async (args: Parameters<Parameters<typeof defineRoute>[0]['action']>[0]) => ({
  data: await setRolePermission((await requireOrgIdentity(args)).userId, args.params.roleId, args.params.permissionId, active),
})

export const PUT = defineRoute({ authorize: requirePermission('create-role-permissions'), action: change(true) })
export const DELETE = defineRoute({ authorize: requirePermission('delete-role-permissions'), action: change(false) })
