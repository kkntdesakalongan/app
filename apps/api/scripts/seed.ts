import { gisData } from '../src/routes/(authenticated)/gis-data/gis-data.table'
import { gisDatasets } from '../src/routes/(authenticated)/gis-data/schema'
import { getDb } from '../src/db'
import { closeDb } from '../src/db'
import { pathToFileURL } from 'node:url'
import { seedAuthorization, seedRoleGroups, seedAdministrator, seedPublicIntakeUser } from './seed-shared'

export async function seedDatabase() {
  await getDb().insert(gisData).values(gisDatasets.map(({ code }) => ({ code }))).onConflictDoNothing()
  await seedRoleGroups()
  await seedAuthorization()
  await seedPublicIntakeUser()
  await seedAdministrator()
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDatabase()
    .then(closeDb)
    .catch(async (error: unknown) => {
      await closeDb()
      throw error
    })
}
