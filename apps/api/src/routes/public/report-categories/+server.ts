import { defineRoute } from '@southneuhof/sprindle'
import { asc } from 'drizzle-orm'
import { getDb } from '../../../db'
import { reportCategories } from '../../(authenticated)/report-categories/report-categories.table'

export const GET = defineRoute({
  action: async () => ({
    data: await getDb().select({ id: reportCategories.id, name: reportCategories.name }).from(reportCategories).orderBy(asc(reportCategories.name)),
  }),
})
