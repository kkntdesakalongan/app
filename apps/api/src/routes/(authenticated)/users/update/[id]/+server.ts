import { update } from '@southneuhof/sprindle'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../../db'
import { requirePermission } from '../../../../../identity'
import { sessions } from '../../../../auth/auth.entity'
import { userSelectSchema, userUpdateSchema } from '../../schema'
import { users } from '../../users.table'

export const PATCH = update({
  authorize: requirePermission('update-users'),
  run: async ({ state }) => {
    const id = state.id
    const found = (await getDb().select().from(users).where(eq(users.id, id)).limit(1))[0]
    if (!found) return undefined
    const input = userUpdateSchema.parse(state.input)
    const updated = await getDb().transaction(async (tx) => {
      const saved = await tx.update(users).set({ ...input, ...(state.values ?? {}) }).where(eq(users.id, id)).returning()
      if (found.statusCode === 'active' && input.statusCode && input.statusCode !== 'active') {
        await tx.delete(sessions).where(eq(sessions.userId, id))
      }
      return saved[0]
    })
    return updated ? userSelectSchema.parse(updated) : undefined
  },
})
