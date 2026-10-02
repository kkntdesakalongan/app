import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from '../users/users.table'

const auditFields = {
  createdByUserId: text('created_by_user_id').references(() => users.id),
  updatedByUserId: text('updated_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
}

export const permissions = pgTable('permissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  permissionCode: text('permission_code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  active: boolean('active').notNull().default(true),
  ...auditFields,
})
