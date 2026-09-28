import type { OptionLoad } from '@southneuhof/loom'

export type Team = { id: string; name: string }
export type RequestDraft = { departmentId: string; teamId: string | null }

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise })
  return { promise, resolve }
}

const teams: Record<string, Team[]> = {
  north: [{ id: 'north-team', name: 'North team' }],
  south: [{ id: 'south-team', name: 'South team' }],
}
let northGate: Deferred<Team[]> | undefined
let teamLoads: string[] = []
let savedRequests: RequestDraft[] = []

export const loadTeams: OptionLoad<Team> = async ({ searchParameters }) => {
  const departmentId = typeof searchParameters.departmentId === 'string' ? searchParameters.departmentId : ''
  teamLoads.push(departmentId)
  if (!departmentId) return { data: [] }
  if (departmentId === 'north' && northGate) return { data: await northGate.promise }
  return { data: teams[departmentId] ?? [] }
}

export async function saveRequest(input: RequestDraft): Promise<RequestDraft> {
  savedRequests.push({ ...input })
  return { ...input }
}

export function holdNorthTeams(): () => void {
  northGate = deferred<Team[]>()
  return () => {
    northGate?.resolve(teams.north ?? [])
    northGate = undefined
  }
}

export function resetRequestFixture(): void {
  northGate = undefined
  teamLoads = []
  savedRequests = []
}

export function readTeamLoads(): string[] {
  return [...teamLoads]
}

export function readSavedRequests(): RequestDraft[] {
  return savedRequests.map((request) => ({ ...request }))
}
