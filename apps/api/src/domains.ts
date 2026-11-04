import { domain as mapPins } from './routes/(authenticated)/map-pins/map-pins.entity'
import { domain as disasterReports } from './routes/(authenticated)/disaster-reports/disaster-reports.entity'
import { domain as auth } from './routes/auth/auth.domain'
import { domain as permissions } from './routes/(authenticated)/permissions/permissions'
import { domain as roles } from './routes/(authenticated)/roles/roles'
import { domain as users } from './routes/(authenticated)/users/users'

export const domains = [auth, permissions, roles, users, disasterReports, mapPins] as const
