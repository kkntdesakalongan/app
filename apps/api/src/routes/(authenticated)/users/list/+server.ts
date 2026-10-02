import { list, validationError } from '@southneuhof/sprindle'
import { and, asc, countDistinct, desc, eq, getTableColumns, ilike, or, type SQL } from 'drizzle-orm'
import { getDb } from '../../../../db'
import { requirePermission } from '../../../../identity'
import { userSelectSchema } from '../schema'
import { users } from '../users.table'

const userColumns = getTableColumns(users) as Record<string, unknown>
const userReservedQueryKeys = new Set(['page', 'limit', 'search', 'sort', 'order'])

function equalityFilters(
  query: Record<string, unknown>,
  columns: Record<string, unknown>,
  options: { ignore?: ReadonlySet<string>; reservedKeys?: ReadonlySet<string> } = {},
): SQL[] {
  const skip = new Set([...(options.reservedKeys ?? new Set(['page', 'limit', 'search', 'sort', 'order', 'permission'])), ...(options.ignore ?? [])])
  const filters: SQL[] = []
  for (const [key, value] of Object.entries(query)) {
    if (skip.has(key) || value === undefined || value === '') continue
    const column = columns[key]
    if (!column) throw validationError(`Unknown query parameter "${key}".`)
    filters.push(eq(column as never, value as never))
  }
  return filters
}

function searchCondition(query: Record<string, unknown>, columns: Record<string, unknown>, searchable: readonly string[]): SQL | undefined {
  const search = typeof query.search === 'string' && query.search ? `%${query.search}%` : undefined
  if (!search) return undefined
  return or(...searchable.map((field) => ilike(columns[field] as never, search)))
}

function orderClause(query: Record<string, unknown>, columns: Record<string, unknown>, fallback: SQL[]): SQL[] {
  if (!query.sort) return fallback
  const column = columns[String(query.sort)]
  if (!column) throw validationError(`Unknown sort column "${String(query.sort)}".`)
  return [query.order === 'desc' ? desc(column as never) : asc(column as never)]
}

function listWhere(query: Record<string, unknown>) {
  const search = searchCondition(query, userColumns, ['name', 'email'])
  const conditions = [
    ...equalityFilters(query, userColumns, { reservedKeys: userReservedQueryKeys }),
    ...(search ? [search] : []),
  ]
  return conditions.length ? and(...conditions) : undefined
}

export const GET = list({
  authorize: requirePermission('list-users'),
  run: async (args) => {
    const query = args.state.query
    const where = listWhere(query)
    const page = Number(query.page)
    const limit = Number(query.limit)
    const db = getDb()
    const [rows, totalRows] = await Promise.all([
      db.selectDistinct({ user: users }).from(users).where(where).orderBy(...orderClause(query, userColumns, [asc(users.name)])).limit(limit).offset((page - 1) * limit),
      db.select({ value: countDistinct(users.id) }).from(users).where(where),
    ])
    return {
      data: rows.map(({ user: row }) => userSelectSchema.parse(row)),
      total: Number(totalRows[0]?.value ?? 0),
    }
  },
})
