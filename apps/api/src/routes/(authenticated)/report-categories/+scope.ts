import { defineScope } from '@southneuhof/sprindle'
import { entity } from './report-categories.entity'
import { categoryReferenceError } from './reference-error'
export default defineScope({ entity, error: categoryReferenceError })
