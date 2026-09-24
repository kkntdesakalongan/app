import type { ClientResponse } from 'hono/client'
import { z } from 'zod/v4'
import { checkedHonoCreateSchema, checkedHonoQuerySchema, checkedHonoRecordSchema, checkedHonoUpdateSchema } from '../schema'

type Row = { id: string; name: string; active: boolean }
type Endpoint<TRequest, TResponse, TStatus extends number> = (args: TRequest) => Promise<ClientResponse<TResponse, TStatus, 'json'>>
type Route = {
  list: { $get: Endpoint<{ query: { search?: string; page?: string } }, { data: Row[]; total: number }, 200> }
  create: { $post: Endpoint<{ json: { name: string } }, { data: Row }, 201> }
  update: { ':id': { $patch: Endpoint<{ param: { id: string }; json: { name?: string; active?: boolean } }, { data: Row }, 200> } }
}

declare const route: Route

const record = z.object({ id: z.string(), name: z.string(), active: z.boolean() })
const query = z.object({ search: z.string().optional(), page: z.coerce.number().int().positive().optional() })
const create = z.object({ name: z.string() })
const update = z.object({ name: z.string().optional(), active: z.boolean().optional() })

checkedHonoRecordSchema(route, record)
checkedHonoQuerySchema(route, query)
checkedHonoCreateSchema(route, create)
checkedHonoUpdateSchema(route, update)

// @ts-expect-error A record schema must retain every required endpoint field.
checkedHonoRecordSchema(route, z.object({ id: z.string(), active: z.boolean() }))
// @ts-expect-error A create schema cannot change the parsed endpoint payload.
checkedHonoCreateSchema(route, z.object({ name: z.string(), roleId: z.string() }))
// @ts-expect-error An update schema cannot change the parsed endpoint payload.
checkedHonoUpdateSchema(route, z.object({ name: z.number().optional() }))
