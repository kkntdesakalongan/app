import { defineSchema } from '../schema'
import type { WebResourceSchema } from '@southneuhof/loom'
import type { ClientResponse } from 'hono/client'
import { z } from 'zod/v4'

const record = z.object({ id: z.string(), name: z.string() })
const optionalId = z.object({ id: z.string().optional(), name: z.string() })
const nullableId = z.object({ id: z.string().nullable(), name: z.string() })
const flagged = z.object({ id: z.string(), active: z.boolean(), name: z.string() })
const tagged = z.object({ id: z.string(), tags: z.array(z.string()), name: z.string() })
const nested = z.object({ id: z.string(), address: z.object({ city: z.string() }), name: z.string() })
const composite = z.object({ tenantId: z.string(), userId: z.number(), name: z.string() })

type CustomRow = { id: string; name: string }
type CustomContract = WebResourceSchema<CustomRow, { search?: string }, { name: string }, { name?: string }, string>

// Positive: inferred numeric zero, scalar IDs, readonly tuples, and fn identities.
defineSchema({ identity: 'id', record: z.object({ id: z.number(), name: z.string() }) })
defineSchema({ identity: 'id', record })
defineSchema({ identity: ['tenantId', 'userId'] as const, record: composite })
defineSchema({ identity: (record: { id: string; name: string }) => record.id, record })
defineSchema({ record })

// Hono overload keeps its write contract with the identity guard.
type Endpoint<TInput, TOutput, TStatus extends number> = (args: TInput, options?: unknown) => Promise<ClientResponse<TOutput, TStatus, 'json'>>
type HonoRoute = {
  list: { $get: Endpoint<{ query: { search?: string } }, { data: Array<{ id: string; name: string }>; page: number; limit: number; total: number }, 200> }
  detail: { ':id': { $get: Endpoint<{ param: { id: string } }, { data: { id: string; name: string } }, 200> } }
  create: { $post: Endpoint<{ json: { name: string; roleIds: string[] } }, { data: { id: string; name: string } }, 201> }
  update: { ':id': { $patch: Endpoint<{ param: { id: string }; json: { name?: string } }, { data: { id: string; name: string } }, 200> } }
}
const honoCreate = z.object({ name: z.string(), roleIds: z.array(z.string()) })
const honoUpdate = z.object({ name: z.string().optional() })
defineSchema({} as HonoRoute, { identity: 'id', record, create: honoCreate, update: honoUpdate })
// @ts-expect-error Hono overload names a record key
defineSchema({} as HonoRoute, { identity: 'missing', record, create: honoCreate, update: honoUpdate })
// @ts-expect-error Hono overload rejects non-scalar keys
defineSchema({} as HonoRoute, { identity: 'active', record: flagged, create: honoCreate, update: honoUpdate })

// Positive: explicit custom contract keeps its check.
defineSchema<CustomContract>({ identity: 'id' })
defineSchema<CustomContract>({
  identity: 'id',
  record: z.object({ id: z.string(), name: z.string() }),
  query: z.object({ search: z.string().optional() }),
  create: z.object({ name: z.string() }),
  update: z.object({ name: z.string().optional() }),
})

// Negative: unknown key.
// @ts-expect-error identity names a record key
defineSchema({
  identity: 'missing',
  record,
})

// Negative: optional scalar key.
// @ts-expect-error identity keys are required
defineSchema({
  identity: 'id',
  record: optionalId,
})

// Negative: nullable scalar key; null is not stripped to fit.
// @ts-expect-error identity values exclude null
defineSchema({
  identity: 'id',
  record: nullableId,
})

// Negative: boolean key.
// @ts-expect-error identity values are string or number
defineSchema({
  identity: 'active',
  record: flagged,
})

// Negative: array key.
// @ts-expect-error identity values exclude arrays
defineSchema({
  identity: 'tags',
  record: tagged,
})

// Negative: object key.
// @ts-expect-error identity values exclude objects
defineSchema({
  identity: 'address',
  record: nested,
})

// Empty key tuple is rejected at runtime (construction check below).
defineSchema({
  identity: [],
  record,
})

// Negative: duplicate tuple keys.
// @ts-expect-error identity tuples reject duplicate keys
defineSchema({
  identity: ['id', 'id'],
  record,
})

// Negative: one tuple member is not a required scalar.
// @ts-expect-error every tuple key is a required scalar
defineSchema({
  identity: ['tenantId', 'active'],
  record: z.object({ tenantId: z.string(), active: z.boolean(), name: z.string() }),
})

// @ts-expect-error function identities return a record identity
defineSchema({ identity: (record: { id: string; name: string }) => record.name.length > 0, record })
