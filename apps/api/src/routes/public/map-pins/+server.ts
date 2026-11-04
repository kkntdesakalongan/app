import { defineRoute } from '@southneuhof/sprindle'
import { getDb } from '../../../db'
import { mapPins } from '../../(authenticated)/map-pins/map-pins.table'
export const GET = defineRoute({ action: async () => getDb().select({ id: mapPins.id, name: mapPins.name, description: mapPins.description, latitude: mapPins.latitude, longitude: mapPins.longitude }).from(mapPins) })
