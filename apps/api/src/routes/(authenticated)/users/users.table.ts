import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import type { UserStatusCode } from './schema'

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  statusCode: text("status_code").notNull().default("active").$type<UserStatusCode>(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => [check('users_status_code_check', sql`${table.statusCode} in ('active', 'non_active', 'expired', 'expiring_soon')`)]);
