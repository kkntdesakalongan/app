import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { reportCategories } from '../report-categories/report-categories.table'

export const disasterReports = pgTable('disaster_reports', {
 id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
 categoryId: text('category_id').references(() => reportCategories.id, { onDelete: 'restrict' }),
 title: text('title').notNull(), description: text('description'), image: text('image'),
 createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
 updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
})
