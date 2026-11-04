import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod'
import { z } from 'zod/v4'
import { optionalText } from '../../../schema'
import { mapPins } from './map-pins.table'


export const mapPinsCreateSchema = createInsertSchema(mapPins).omit({ id: true, createdAt: true, updatedAt: true }).extend({ name: z.string().trim().min(1).max(255), description: optionalText(10000), latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180), })
export const mapPinsUpdateSchema = mapPinsCreateSchema
export const mapPinsSelectSchema = createSelectSchema(mapPins)
