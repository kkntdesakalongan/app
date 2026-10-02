import { defineRoute } from '@southneuhof/sprindle'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../../db'
import { requirePermission } from '../../../../../identity'
import { listRoleAssignments } from './role-assignments'
import { users } from '../../users.table'

export const GET = defineRoute({
  authorize: requirePermission('list-role-assignments'),
  action: async (args) => {
    const userId = args.params.userId
    const found = (await getDb().select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1))[0]
    if (!found) return args.c.json({ error: 'not_found' }, 404)
    const data = await listRoleAssignments(userId)
    return { data, total: data.length }
  },
})
