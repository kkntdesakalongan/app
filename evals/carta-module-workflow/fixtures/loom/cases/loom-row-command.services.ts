import type { CollectionLoadContext } from '@southneuhof/loom'

export type RequestRecord = { id: string; status: string; allowedOperations: string[] }
export type VerifyInput = { id: string; note: string }
export type VerifyResult = { id: string; status: string; note: string }

const records = new Map<string, RequestRecord>([
  ['request-1', { id: 'request-1', status: 'open', allowedOperations: ['verify'] }],
])
let listLoads = 0
let verified: VerifyInput[] = []

export async function listRequests(_context: CollectionLoadContext): Promise<{ data: RequestRecord[] }> {
  listLoads += 1
  return { data: [...records.values()].map((record) => ({ ...record, allowedOperations: [...record.allowedOperations] })) }
}

export async function verifyRequest(input: VerifyInput): Promise<VerifyResult> {
  const record = records.get(input.id)
  if (record) records.set(input.id, { ...record, status: 'verified' })
  verified.push({ ...input })
  return { id: input.id, status: 'verified', note: input.note }
}

export function resetRequestCommandFixture(): void {
  records.clear()
  records.set('request-1', { id: 'request-1', status: 'open', allowedOperations: ['verify'] })
  listLoads = 0
  verified = []
}

export function readRequestListLoads(): number {
  return listLoads
}

export function readVerifiedRequests(): VerifyInput[] {
  return verified.map((input) => ({ ...input }))
}
