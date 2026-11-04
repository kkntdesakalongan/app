import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const disasterReports = pgTable('disaster_reports', {
 id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
 title: text('title').notNull(), description: text('description'), image: text('image'),
 createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
 updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
})
