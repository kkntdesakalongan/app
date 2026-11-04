import { createEntity } from '@southneuhof/sprindle/entity'
import { defineDomainPart } from '@southneuhof/sprindle/model'
import { mapPins } from './map-pins.table'
import { mapPinsCreateSchema, mapPinsUpdateSchema, mapPinsSelectSchema } from './schema'
export const entity = createEntity({ table: mapPins, schemas: { create: mapPinsCreateSchema, update: mapPinsUpdateSchema, select: mapPinsSelectSchema } })
export const domain = defineDomainPart({ tables: { mapPins }, entities: [entity] })
