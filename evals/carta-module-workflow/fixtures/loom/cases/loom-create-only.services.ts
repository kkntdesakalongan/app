export type CreateServiceRequest = { name: string }
export type CreatedServiceRequest = { id: string; name: string }

let created: CreatedServiceRequest[] = []

export async function createServiceRequest(input: CreateServiceRequest): Promise<CreatedServiceRequest> {
  const result = { id: `request-${created.length + 1}`, name: input.name }
  created.push(result)
  return { ...result }
}

export function resetCreateOnlyFixture(): void {
  created = []
}

export function readCreatedRequests(): CreatedServiceRequest[] {
  return created.map((record) => ({ ...record }))
}
