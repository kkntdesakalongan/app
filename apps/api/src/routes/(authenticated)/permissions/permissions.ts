import { defineDomainPart } from '@southneuhof/sprindle/model'
import { permission } from './permissions.entity'
import { permissions } from './permissions.table'

export const domain = defineDomainPart({
  tables: { permissions },
  entities: [permission],
})
