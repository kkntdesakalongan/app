import { z } from 'zod/v4'

export const collectionQueryFields = {
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  sort: z.enum(['asc', 'desc']).optional(),
}

export function encodeCollectionQuery(values: Record<string, unknown>): Record<string, unknown> {
  const { sort_by, sort, ...query } = values
  return {
    ...query,
    ...(sort_by === undefined ? {} : { sort: sort_by }),
    ...(sort === undefined ? {} : { order: sort }),
  }
}
