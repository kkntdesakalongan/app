import type { OptionLoad } from '@southneuhof/loom'

export type Category = { id: string; name: string }
export type RenameCategory = { id: string; name: string }
export type ServiceRequest = { id: string; categoryId: string; summary: string }

const initialCategory: Category = { id: 'support', name: 'Support' }
let categories = new Map<string, Category>([[initialCategory.id, initialCategory]])
let created: ServiceRequest[] = []
let categoryLoads = 0

export const loadCategories: OptionLoad<Category> = async () => {
  categoryLoads += 1
  return { data: [...categories.values()].map((category) => ({ ...category })) }
}

export async function renameCategory(input: RenameCategory): Promise<Category> {
  const category = { ...input }
  categories.set(category.id, category)
  return { ...category }
}

export async function createServiceRequest(input: Omit<ServiceRequest, 'id'>): Promise<ServiceRequest> {
  const request = { ...input, id: `request-${created.length + 1}` }
  created.push(request)
  return { ...request }
}

export function resetRelationFixture(): void {
  categories = new Map([[initialCategory.id, initialCategory]])
  created = []
  categoryLoads = 0
}

export function readCategoryLoads(): number {
  return categoryLoads
}

export function readCreatedServiceRequests(): ServiceRequest[] {
  return created.map((request) => ({ ...request }))
}
