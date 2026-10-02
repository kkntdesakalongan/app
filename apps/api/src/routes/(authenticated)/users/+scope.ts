import { defineScope } from '@southneuhof/sprindle'
import { storedAssetModel } from '../../../storage/assets'
import { user } from './users.entity'
import { userSelectSchema } from './schema'

export default defineScope({ entity: user, enrich: storedAssetModel(userSelectSchema) })
