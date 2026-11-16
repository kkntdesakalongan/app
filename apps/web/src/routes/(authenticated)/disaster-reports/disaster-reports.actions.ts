import { createHonoResourceActions } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { publicCategoryActions } from '../master/report-categories/category-field'
import { querySchema } from './disaster-reports.schema'

const api = createHonoResourceActions(rpc['disaster-reports'], { querySchema })
async function categoryNames(signal?: AbortSignal) {
  const categories = await publicCategoryActions['report-categories']({ signal, query: {}, searchParameters: {} })
  return new Map(categories.data.map((category) => [category.id, category.name]))
}
export const actions = {
  ...api,
  list: async (context: Parameters<typeof api.list>[0]) => {
    const result = await api.list(context)
    const names = await categoryNames(context.signal)
    return { ...result, data: result.data.map((record) => ({ ...record, categoryName: record.categoryId ? (names.get(record.categoryId) ?? null) : null })) }
  },
  detail: async (context: Parameters<typeof api.detail>[0]) => {
    const record = await api.detail(context)
    if (!record) return undefined
    const names = await categoryNames(context.signal)
    return { ...record, categoryName: record.categoryId ? (names.get(record.categoryId) ?? null) : null }
  },
}
