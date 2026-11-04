import { createEntity } from '@southneuhof/sprindle/entity'
import { defineDomainPart } from '@southneuhof/sprindle/model'
import { disasterReports } from './disaster-reports.table'
import { disasterReportsCreateSchema, disasterReportsUpdateSchema, disasterReportsSelectSchema } from './schema'
export const entity = createEntity({ table: disasterReports, schemas: { create: disasterReportsCreateSchema, update: disasterReportsUpdateSchema, select: disasterReportsSelectSchema } })
export const domain = defineDomainPart({ tables: { disasterReports }, entities: [entity] })
