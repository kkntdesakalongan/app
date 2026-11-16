import { defineRoute } from '@southneuhof/sprindle'
import { getDb } from '../../../../db'
import { readJsonBody } from '../../../../request-body'
import { disasterReportsCreateSchema } from '../../../(authenticated)/disaster-reports/schema'
import { disasterReports } from '../../../(authenticated)/disaster-reports/disaster-reports.table'

import { categoryReferenceError } from '../../../(authenticated)/report-categories/reference-error'

export const POST = defineRoute({
  error: categoryReferenceError,
  openapi: { requestBody: disasterReportsCreateSchema },
  action: async ({ c }) => {
    const input = disasterReportsCreateSchema.parse(await readJsonBody(c))
    const [record] = await getDb().insert(disasterReports).values(input).returning({ id: disasterReports.id })
    return c.json({ data: record }, 201)
  },
})
