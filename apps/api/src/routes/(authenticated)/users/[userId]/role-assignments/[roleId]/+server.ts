import { defineRoute, HttpError, notFound } from '@southneuhof/sprindle'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../../../../db'
import { requireOrgIdentity, requirePermission } from '../../../../../../identity'
import { roleAssignments, roles } from '../../../../roles/roles.table'
import { listRoleAssignments } from '../role-assignments'
import { users } from '../../../users.table'

function now() {
  return new Date().toISOString()
}

async function setRoleAssignment(actorUserId: string, userId: string, roleId: string, active: boolean) {
  await getDb().transaction(async (tx) => {
    const foundRole = (await tx.select().from(roles).where(eq(roles.id, roleId)).limit(1))[0]
    if (!foundRole) throw notFound()
    if (active && !foundRole.active) throw new HttpError(422, 'role_inactive')
    const existing = (await tx.select().from(roleAssignments).where(and(
      eq(roleAssignments.userId, userId),
      eq(roleAssignments.roleId, roleId),
    )).limit(1))[0]
    if (active) {
      if (existing?.active) return
      if (existing) {
        await tx.update(roleAssignments).set({ active: true, updatedAt: now(), updatedByUserId: actorUserId }).where(eq(roleAssignments.id, existing.id))
        return
      }
      await tx.insert(roleAssignments).values({
        userId,
        roleId,
        active: true,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      })
      return
    }
    if (existing?.active) {
      await tx.update(roleAssignments).set({ active: false, updatedAt: now(), updatedByUserId: actorUserId }).where(eq(roleAssignments.id, existing.id))
    }
  })
  return listRoleAssignments(userId)
}

const change = (active: boolean) => async (args: Parameters<Parameters<typeof defineRoute>[0]['action']>[0]) => {
  const found = (await getDb().select({ id: users.id }).from(users).where(eq(users.id, args.params.userId)).limit(1))[0]
  if (!found) return args.c.json({ error: 'not_found' }, 404)
  return { data: await setRoleAssignment((await requireOrgIdentity(args)).userId, args.params.userId, args.params.roleId, active) }
}

export const PUT = defineRoute({ authorize: requirePermission('create-role-assignments'), action: change(true) })
export const DELETE = defineRoute({ authorize: requirePermission('delete-role-assignments'), action: change(false) })
