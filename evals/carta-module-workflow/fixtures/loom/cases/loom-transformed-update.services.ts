import type { CollectionLoadContext, RecordLoadContext } from '@southneuhof/loom'

export type AmountRecord = { id: string; displayName: string; amountMinor: number }
export type AmountOutput = { displayName: string; amountMinor: number }

const records = new Map<string, AmountRecord>([
  ['amount-7', { id: 'amount-7', displayName: 'Service fee', amountMinor: 1234 }],
])
let loadedIds: string[] = []
let updates: Array<{ id: string; output: AmountOutput }> = []

export async function loadAmount({ id }: RecordLoadContext): Promise<AmountRecord | undefined> {
  const target = typeof id === 'string' ? id : ''
  loadedIds.push(target)
  const record = records.get(target)
  return record ? { ...record } : undefined
}

export async function listAmounts(_context: CollectionLoadContext): Promise<{ data: AmountRecord[] }> {
  return { data: [...records.values()].map((record) => ({ ...record })) }
}

export async function saveAmount(id: string, output: AmountOutput): Promise<AmountRecord> {
  const updated = { id, ...output }
  records.set(id, updated)
  updates.push({ id, output: { ...output } })
  return { ...updated }
}

export function resetAmountFixture(): void {
  records.clear()
  records.set('amount-7', { id: 'amount-7', displayName: 'Service fee', amountMinor: 1234 })
  loadedIds = []
  updates = []
}

export function readAmountLoads(): string[] {
  return [...loadedIds]
}

export function readAmountUpdates(): Array<{ id: string; output: AmountOutput }> {
  return updates.map(({ id, output }) => ({ id, output: { ...output } }))
}
