import { deleteRoute, HttpError, isHttpError, notFound } from '@southneuhof/sprindle'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../../../db'
import { requirePermission } from '../../../../../identity'
import { roleAssignments, roles } from '../../roles.table'

export const DELETE = deleteRoute({
  authorize: requirePermission('delete-roles'),
  run: async ({ state }) => {
    await getDb().transaction(async (tx) => {
      const assignments = await tx
        .select({ id: roleAssignments.id })
        .from(roleAssignments)
        .where(and(eq(roleAssignments.roleId, state.id), eq(roleAssignments.active, true)))
      if (assignments.length) throw new HttpError(409, 'role_in_use', undefined, [{ field: 'assignmentCount', message: String(assignments.length) }])
      await tx.delete(roleAssignments).where(eq(roleAssignments.roleId, state.id))
      const deleted = await tx.delete(roles).where(eq(roles.id, state.id)).returning({ id: roles.id })
      if (!deleted[0]) throw notFound()
    })
  },
  error: async ({ c, error }) => {
    if (!isHttpError(error) || error.code !== 'role_in_use') return
    const assignmentCount = Number(error.issues?.find((item) => item.field === 'assignmentCount')?.message ?? 0)
    return c.json({ error: error.code, assignmentCount }, 409)
  },
})
