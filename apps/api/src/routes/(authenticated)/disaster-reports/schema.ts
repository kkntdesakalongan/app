import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod'
import { z } from 'zod/v4'
import { optionalText } from '../../../schema'
import { disasterReports } from './disaster-reports.table'

export const reportImageSchema = z.string().max(7_000_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/).refine((value) => {
 const encoded = value.split(',')[1]
 if (!encoded || encoded.length % 4 !== 0) return false
 let bytes: Uint8Array
 try { bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0)) } catch { return false }
 if (bytes.length > 5_000_000) return false
 if (value.startsWith('data:image/png;')) return [137,80,78,71,13,10,26,10].every((byte, index) => bytes[index] === byte)
 if (value.startsWith('data:image/jpeg;')) return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
 return String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP'
}, 'Use a PNG, JPEG, or WebP image up to 5 MB.')

export const disasterReportsCreateSchema = createInsertSchema(disasterReports).omit({ id: true, createdAt: true, updatedAt: true }).extend({ title: z.string().trim().min(1).max(255), description: optionalText(10000), image: reportImageSchema.nullable().optional(), })
export const disasterReportsUpdateSchema = disasterReportsCreateSchema
export const disasterReportsSelectSchema = createSelectSchema(disasterReports)
