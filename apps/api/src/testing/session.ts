import { eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { getDb, setPoolCloseHook } from '../db'
import { getAuth } from '../routes/auth/auth'
import { accounts, sessions } from '../routes/auth/auth.entity'
import { permissions } from '../routes/(authenticated)/permissions/permissions.table'
import {
  rolePermissions,
  roleAssignments,
  roles,
} from '../routes/(authenticated)/roles/roles.table'
import { users } from '../routes/(authenticated)/users/users.table'

export type TestSession = {
  userId: string
  roleId: string
  /** First cookie pair from better-auth's sign-in response headers. */
  cookie: string
}

const PASSWORD = 'test-password'

/** Collision-free identifier namespaced per test family. */
export function testId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

async function insertPermission(db: ReturnType<typeof getDb>, code: string) {
  await db.insert(permissions).values({ id: testId('permission'), permissionCode: code, name: code }).onConflictDoNothing()
  const row = (await db.select({ id: permissions.id }).from(permissions).where(eq(permissions.permissionCode, code)).limit(1))[0]
  if (!row) throw new Error(`Permission fixture is missing: ${code}`)
  return row.id
}

/**
 * Signs in a fresh user holding exactly `permissionCodes` as global-scope
 * grants, registers teardown, and returns the session. Business rows the spec
 * creates stay the spec's responsibility.
 */
export async function createSystemSession(permissionCodes: readonly string[], label = 'test'): Promise<TestSession> {
  const db = getDb()
  const userId = testId(`${label}-user`)
  const roleId = testId(`${label}-role`)
  const email = `${userId}@example.invalid`

  await db.insert(users).values({ id: userId, name: `${label} Test User`, email })
  await db.insert(accounts).values({ id: testId(`${label}-account`), accountId: userId, providerId: 'credential', userId, password: await hashPassword(PASSWORD) })
  await db.insert(roles).values({ id: roleId, roleCode: testId(`${label}-role-code`), name: `${label} Test Role` })
  for (const code of permissionCodes) {
    const permissionId = await insertPermission(db, code)
    await db.insert(rolePermissions).values({ roleId, permissionId })
  }
  await db.insert(roleAssignments).values({ userId, roleId })

  const signedIn = await getAuth().api.signInEmail({ body: { email, password: PASSWORD }, returnHeaders: true })
  registerTeardown({ userId, roleId })
  return { userId, roleId, cookie: signedIn.headers.get('set-cookie')?.split(';')[0] ?? '' }
}

const teardowns: Array<() => Promise<void>> = []

function registerTeardown(ids: { userId: string; roleId: string }) {
  teardowns.push(async () => {
    const db = getDb()
    await db.delete(sessions).where(eq(sessions.userId, ids.userId))
    await db.delete(accounts).where(eq(accounts.userId, ids.userId))
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, ids.userId))
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, ids.roleId))
    await db.delete(roles).where(eq(roles.id, ids.roleId))
    await db.delete(users).where(eq(users.id, ids.userId))
  })
}

/** Runs and clears every registered session teardown (use in afterEach/afterAll). */
export async function cleanupSessions(): Promise<void> {
  while (teardowns.length) await teardowns.pop()!()
}

// Session teardown must precede the pool close, so it hooks into closeDb
// instead of relying on spec-level hook ordering.
setPoolCloseHook(cleanupSessions)
