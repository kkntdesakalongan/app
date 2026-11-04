import { deleteRoute } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../../identity'
export const DELETE = deleteRoute({ authorize: requirePermission('delete-disaster-reports') })
