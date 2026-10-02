import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { eq } from 'drizzle-orm'
import { getDb } from '../../db'
import { users } from '../(authenticated)/users/users.table'
import { accounts, sessions, verifications } from './auth.entity'

const schema = { users, sessions, accounts, verifications }

function requiredEnv(name: 'BETTER_AUTH_SECRET' | 'BETTER_AUTH_URL') {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required.`)
  return value
}

export function createAuth({ allowSignUp = false }: { allowSignUp?: boolean } = {}) {
  return betterAuth({
    secret: requiredEnv('BETTER_AUTH_SECRET'),
    baseURL: requiredEnv('BETTER_AUTH_URL'),
    trustedOrigins: process.env.APP_ORIGIN ? [process.env.APP_ORIGIN] : [],
    database: drizzleAdapter(getDb(), { provider: 'pg', schema, usePlural: true }),
    emailAndPassword: { enabled: true, disableSignUp: !allowSignUp },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const user = (await getDb().select({ statusCode: users.statusCode }).from(users).where(eq(users.id, session.userId)).limit(1))[0]
            return user?.statusCode === 'active'
          },
        },
      },
    },
  })
}

let auth: ReturnType<typeof createAuth> | undefined
export function getAuth() {
  return (auth ??= createAuth())
}
