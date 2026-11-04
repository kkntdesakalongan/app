import { list } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../identity'
export const GET = list({ authorize: requirePermission('list-map-pins') })
