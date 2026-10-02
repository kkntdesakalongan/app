import { created, defineRoute, HttpError, isHttpError, unauthorized } from '@southneuhof/sprindle'
import { eq, inArray } from 'drizzle-orm'
import { getDb } from '../../../../db'
import { orgIdentity, requirePermission } from '../../../../identity'
import { createAuth } from '../../../auth/auth'
import { readJsonBody } from '../../../../request-body'
import { publicRecord } from '../../../../storage/assets'
import { roleAssignments, roles } from '../../roles/roles.table'
import { createUserSchema, userSelectSchema } from '../schema'
import { users } from '../users.table'

function initialRoleIds(roleIds: string[]) {
  const uniqueRoleIds = [...new Set(roleIds)]
  if (!uniqueRoleIds.length || uniqueRoleIds.length !== roleIds.length) throw new HttpError(422, 'roles_required')
  return uniqueRoleIds
}

async function validateInitialRoles(roleIds: string[]) {
  const uniqueRoleIds = initialRoleIds(roleIds)
  const foundRoles = await getDb().select({ id: roles.id, active: roles.active }).from(roles).where(inArray(roles.id, uniqueRoleIds))
  if (foundRoles.length !== uniqueRoleIds.length || foundRoles.some((row) => !row.active)) throw new HttpError(422, 'roles_required')
  return uniqueRoleIds
}

async function assignInitialRoles(actorUserId: string, userId: string, roleIds: string[]) {
  const uniqueRoleIds = initialRoleIds(roleIds)
  await getDb().transaction(async (tx) => {
    const foundRoles = await tx.select({ id: roles.id, active: roles.active }).from(roles).where(inArray(roles.id, uniqueRoleIds))
    if (foundRoles.length !== uniqueRoleIds.length || foundRoles.some((row) => !row.active)) throw new HttpError(422, 'roles_required')
    await tx.insert(roleAssignments).values(uniqueRoleIds.map((roleId) => ({
      userId,
      roleId,
      active: true,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    })))
  })
}

export const POST = defineRoute({
  openapi: { requestBody: createUserSchema },
  authorize: requirePermission('create-users'),
  action: async (args) => {
    const input = createUserSchema.parse(await readJsonBody(args.c))
    const identity = await orgIdentity(args)
    if (!identity) throw unauthorized()
    const existing = await getDb().select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1)
    if (existing[0]) return args.c.json({ error: 'email_exists' }, 409)

    let userId: string | undefined
    try {
      await validateInitialRoles(input.roleIds)
      const result = await createAuth({ allowSignUp: true }).api.signUpEmail({
        body: { name: input.name, email: input.email, password: input.password },
      })
      userId = result.user?.id
      if (!userId) return args.c.json({ error: 'user_create_failed' }, 422)
      const updated = await getDb().select().from(users).where(eq(users.id, userId)).limit(1)
      await assignInitialRoles(identity.userId, userId, input.roleIds)
      const createdUser = userSelectSchema.parse(updated[0] ?? result.user)
      return created(args.c, publicRecord(userSelectSchema, createdUser))
    } catch (error) {
      if (userId) await getDb().delete(users).where(eq(users.id, userId))
      if (isHttpError(error)) return args.c.json({ error: error.code, ...(error.message ? { message: error.message } : {}) }, error.status as 400)
      return args.c.json({ error: 'user_create_failed' }, 409)
    }
  },
})
