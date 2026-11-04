import { pgTable, text, timestamp, doublePrecision } from 'drizzle-orm/pg-core'

export const mapPins = pgTable('map_pins', {
 id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
 name: text('name').notNull(), description: text('description'), latitude: doublePrecision('latitude').notNull(), longitude: doublePrecision('longitude').notNull(),
 createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
 updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
})
