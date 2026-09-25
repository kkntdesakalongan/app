import type { CollectionResult, DataAdapter, RecordResult, SchemaIssue, SubmitError } from '@southneuhof/loom'

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

export function normalizeCollection<TRecord extends object>(payload: unknown): CollectionResult<TRecord> {
  if (Array.isArray(payload)) return { data: payload as TRecord[] }
  if (!isRecord(payload) || !Array.isArray(payload.data)) return { data: [] }

  const nestedMeta = isRecord(payload.meta) ? payload.meta : undefined
  const source = nestedMeta ? { ...payload, ...nestedMeta } : payload
  const total = typeof source.total === 'number' ? source.total : undefined
  const pageSize = typeof source.limit === 'number' ? source.limit : typeof source.pageSize === 'number' ? source.pageSize : undefined
  const page = typeof source.page === 'number' ? source.page : undefined
  const totalPage = typeof source.totalPage === 'number' ? source.totalPage : total != null && pageSize && pageSize > 0 ? Math.ceil(total / pageSize) : undefined

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

function submitErrorMetadata(error: unknown): Pick<SubmitError, 'code' | 'operation' | 'retryable' | 'postWrite'> {
  if (!isRecord(error)) return {}
  return {
    ...(typeof error.code === 'string' ? { code: error.code } : {}),
    ...(typeof error.operation === 'string' ? { operation: error.operation } : {}),
    ...(typeof error.retryable === 'boolean' ? { retryable: error.retryable } : {}),
    ...(typeof error.postWrite === 'boolean' ? { postWrite: error.postWrite } : {}),
  }
}

export function normalizeError(error: unknown): SubmitError {
  if (error instanceof Error) return { message: error.message, ...submitErrorMetadata(error) }
  if (isRecord(error)) {
    const message = typeof error.message === 'string' ? error.message : 'Request failed.'
    const issues = collectIssues(error.errors)
    return { message, ...submitErrorMetadata(error), ...(issues ? { issues } : {}) }
  }
  return { message: 'Request failed.' }
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  if (!isRecord(error)) return fallback
  const message = typeof error.message === 'string' ? error.message : ''
  return message || fallback
}

export const dataAdapter: DataAdapter = { normalizeCollection, normalizeRecord, normalizeError }
