import { defaultDataAdapter, type CollectionResult, type DataAdapter, type RecordResult, type SchemaIssue, type SubmitError } from '@southneuhof/loom'
import { z } from 'zod/v4'

/**
 * Backend conventions of this project, kept out of framework components.
 *
 * Operation adapters own collection and record wire normalization. Validation
 * failures arrive as `{ message, errors }`, where `errors` maps a property path
 * to messages.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const collectionMetadata = z.object({
  total: z.int().nonnegative().optional(),
  page: z.int().positive().optional(),
  limit: z.int().positive().optional(),
  pageSize: z.int().positive().optional(),
  totalPage: z.int().nonnegative().optional(),
})

export function normalizeCollection<TRecord extends object>(payload: unknown): CollectionResult<TRecord> {
  if (Array.isArray(payload)) return { data: payload as TRecord[] }
  if (!isRecord(payload) || !Array.isArray(payload.data)) throw new Error('The server returned an invalid collection envelope.')
  if (payload.meta !== undefined && !isRecord(payload.meta)) throw new Error('The server returned invalid collection metadata.')

  const nestedMeta = isRecord(payload.meta) ? payload.meta : undefined
  const source = nestedMeta ? { ...payload, ...nestedMeta } : payload
  const parsed = collectionMetadata.safeParse(source)
  if (!parsed.success) throw new Error('The server returned invalid collection metadata.')
  const { total, page } = parsed.data
  const pageSize = parsed.data.limit ?? parsed.data.pageSize
  const totalPage = parsed.data.totalPage ?? (total !== undefined && pageSize !== undefined ? Math.ceil(total / pageSize) : undefined)

  return {
    data: payload.data as TRecord[],
    meta: { total, page, pageSize, totalPage },
  }
}

export function normalizeRecord<TRecord extends object>(payload: unknown): RecordResult<TRecord> {
  if (!isRecord(payload)) return undefined
  if (isRecord(payload.data)) return payload.data as TRecord
  return payload as TRecord
}

function collectIssues(errors: unknown): SchemaIssue[] | undefined {
  if (!isRecord(errors)) return undefined
  const issues: SchemaIssue[] = []
  for (const [path, messages] of Object.entries(errors)) {
    const list = Array.isArray(messages) ? messages : [messages]
    for (const message of list) {
      if (typeof message !== 'string') continue
      issues.push({ path: path.split('.'), message })
    }
  }
  return issues.length ? issues : undefined
}

export function normalizeError(error: unknown): SubmitError {
  const normalized = defaultDataAdapter.normalizeError(error)
  const issues = isRecord(error) ? (normalized.issues ?? collectIssues(error.errors)) : normalized.issues
  return issues ? { ...normalized, issues } : normalized
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  if (!isRecord(error)) return fallback
  const message = typeof error.message === 'string' ? error.message : ''
  return message || fallback
}

export const dataAdapter: DataAdapter = { normalizeCollection, normalizeRecord, normalizeError }
