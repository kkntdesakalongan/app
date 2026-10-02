import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../../../db'
import { roleAssignments, roles } from '../../../roles/roles.table'

export async function listRoleAssignments(userId: string) {
  const db = getDb()
  const [roleRows, assignmentRows] = await Promise.all([
    db.select({ id: roles.id, roleCode: roles.roleCode, name: roles.name, description: roles.description, active: roles.active })
      .from(roles).orderBy(roles.roleCode),
    db.select({ roleId: roleAssignments.roleId })
      .from(roleAssignments).where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.active, true))),
  ])
  const assignedIds = new Set(assignmentRows.map((row) => row.roleId))
  return roleRows
    .filter((role) => role.active || assignedIds.has(role.id))
    .map((role) => ({ ...role, assigned: assignedIds.has(role.id) }))
}
