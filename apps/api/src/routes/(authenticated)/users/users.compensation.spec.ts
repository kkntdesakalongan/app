import { afterAll, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => ({ roleId: undefined as string | undefined, userId: undefined as string | undefined }))

vi.mock('../../auth/auth', async () => {
  const actual = await vi.importActual<typeof import('../../auth/auth')>('../../auth/auth')
  return {
    ...actual,
    createAuth: vi.fn((options?: Parameters<typeof actual.createAuth>[0]) => {
      const auth = actual.createAuth(options)
      return {
        ...auth,
        api: {
          ...auth.api,
          signUpEmail: async (...args: Parameters<typeof auth.api.signUpEmail>) => {
            const result = await auth.api.signUpEmail(...args)
            testState.userId = result.user?.id
            if (testState.roleId) {
              await getDb().update(roles).set({ active: false }).where(eq(roles.id, testState.roleId))
            }
            return result
          },
        },
      }
    }),
  }
})

import { hashPassword } from 'better-auth/crypto'
import { eq } from 'drizzle-orm'
import { app } from '../../../app'
import { closeDb, getDb } from '../../../db'
import { permissions } from '../permissions/permissions.table'
import { rolePermissions, roles, roleAssignments } from '../roles/roles.table'
import { accounts, sessions } from '../../auth/auth.entity'
import { getAuth } from '../../auth/auth'
import { users } from './users.table'

function id(prefix: string) {
  return `user-compensation-test-${prefix}-${crypto.randomUUID()}`
}

async function adminSession() {
  const db = getDb()
  const userId = id('admin')
  const email = `${userId}@example.invalid`
  const roleId = id('role')
  await db.insert(users).values({ id: userId, name: 'Compensation Admin', email })
  await db.insert(accounts).values({ id: id('account'), accountId: userId, providerId: 'credential', userId, password: await hashPassword('test-password') })
  await db.insert(permissions).values({ id: id('permission'), permissionCode: 'create-users', name: 'Create Users' }).onConflictDoNothing()
  await db.insert(roles).values({ id: roleId, roleCode: id('role-code'), name: 'Compensation Admin Role' })
  const permission = (await db.select({ id: permissions.id }).from(permissions).where(eq(permissions.permissionCode, 'create-users')).limit(1))[0]!
  await db.insert(roleAssignments).values({ userId, roleId })
  await db.insert(rolePermissions).values({ roleId, permissionId: permission.id })
  const signedIn = await getAuth().api.signInEmail({ body: { email, password: 'test-password' }, returnHeaders: true })
  return { cookie: signedIn.headers.get('set-cookie')?.split(';')[0] ?? '' }
}

describe('user creation compensation', () => {
  afterAll(() => closeDb())

  it('removes all Better Auth and assignment rows after a post-create role failure', async () => {
    const session = await adminSession()
    const db = getDb()
    const roleId = id('target-role')
    testState.roleId = roleId
    const email = `${id('created')}@example.invalid`
    await db.insert(roles).values({ id: roleId, roleCode: id('target-role-code'), name: 'Target Role' })

    const response = await app.request('/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: session.cookie },
      body: JSON.stringify({ name: 'Created Then Removed', email, password: 'password-123', roleIds: [roleId] }),
    })
    expect(response.status).toBe(422)
    expect((await response.json()).error).toBe('roles_required')
    const createdUserId = testState.userId
    if (!createdUserId) throw new Error('The compensation test did not receive the created user ID.')
    expect(await db.select({ id: users.id }).from(users).where(eq(users.id, createdUserId))).toHaveLength(0)
    expect(await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, createdUserId))).toHaveLength(0)
    expect(await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, createdUserId))).toHaveLength(0)
    expect(await db.select({ roleId: roleAssignments.roleId }).from(roleAssignments).where(eq(roleAssignments.userId, createdUserId))).toHaveLength(0)
  })
})
