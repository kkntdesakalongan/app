import { z } from 'zod/v4'
import { locationOperations } from '@/framework/adapters/location'
import { createSchema } from './disaster-reports.schema'
export const reportFormSchema = z.object({
  ...createSchema.shape,
  image: z
    .custom<File>((value) => typeof File !== 'undefined' && value instanceof File)
    .nullable()
    .optional(),
  removeImage: z.boolean().optional(),
})
export async function reportPayload(value: z.output<typeof reportFormSchema>) {
  const { image, removeImage, ...fields } = value
  if (!(image instanceof File)) return { ...fields, ...(removeImage ? { image: null } : {}) }
  const encoded = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Cannot read image.')))
    reader.onerror = () => reject(new Error('Cannot read image.'))
    reader.readAsDataURL(image)
  })
  return { ...fields, image: encoded }
}

export const reportLocationField = {
  renderer: 'location',
  label: 'Lokasi',
  initialValue: () => null,
  props: { mapProvider: 'openstreetmap', operations: locationOperations },
  binding: {
    keys: ['latitude', 'longitude'],
    read: ({ latitude, longitude }: z.input<typeof reportFormSchema>) => (latitude == null || longitude == null ? null : { lat: latitude, lng: longitude }),
    write: ({ lat, lng }: { lat: number; lng: number }) => ({ latitude: lat, longitude: lng }),
  },
} as const
