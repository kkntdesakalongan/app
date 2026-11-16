import { defineScope } from '@southneuhof/sprindle'
import { entity } from './disaster-reports.entity'
import { categoryReferenceError } from '../report-categories/reference-error'
export default defineScope({ entity, error: categoryReferenceError })
