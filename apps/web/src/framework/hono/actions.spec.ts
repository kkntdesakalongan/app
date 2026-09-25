import { Hono } from 'hono'
import { hc } from 'hono/client'
import { validator } from 'hono/validator'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { createHonoResourceActions } from './actions'
import { collectionQueryFields } from './collectionQuery'

const app = new Hono()
  .get(
    '/rows/list',
    validator(
      'query',
      (value) =>
        value as {
          page?: string
          limit?: string
          search?: string
          sort?: string
          order?: string
          statusCode?: string
          active?: string
          enabled?: string
          zero?: string
          tags?: string
          details?: string
          at?: string
          blank?: string
          nullable?: string
        }
    ),
    (context) => context.json({ data: [{ id: '1', name: 'One' }], page: 1, limit: 10, total: 1 })
  )
  .get('/rows/detail/:id', (context) => context.json({ data: { id: context.req.param('id'), name: 'One' } }))
  .post(
    '/rows/create',
    validator('json', (value) => value as { name: string; nested: { value: string } }),
    (context) => context.json({ data: { id: '2', name: 'Two' } }, 201)
  )
  .patch(
    '/rows/update/:id',
    validator('json', (value) => value as { name: string; nested: { value: string } }),
    (context) => context.json({ data: { id: context.req.param('id'), name: 'Updated' } })
  )
  .delete('/rows/delete/:id', (context) => context.json({ deleted: context.req.param('id') }))

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => app.fetch(new Request(String(input), init)))

const querySchema = z.object({
  ...collectionQueryFields,
  search: z.string().trim().optional(),
  sort_by: z.enum(['name', 'email']).optional(),
  statusCode: z.string().optional(),
  blank: z.string().optional(),
  nullable: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  zero: z.number().optional(),
  tags: z.array(z.string()).optional(),
  details: z.object({ role: z.string() }).optional(),
  at: z.date().optional(),
})

function requestQuery(index = 0) {
  const input = fetchMock.mock.calls[index]?.[0]
  return Object.fromEntries(new URL(String(input)).searchParams.entries())
}

afterEach(() => fetchMock.mockClear())

describe('createHonoResourceActions', () => {
  it('validates and encodes one canonical query while preserving the endpoint protocol', async () => {
    const rpc = hc<typeof app>('https://api.test', { fetch: fetchMock })
    const actions = createHonoResourceActions(rpc.rows, { querySchema })
    const at = new Date('2026-08-26T00:00:00.000Z')
    const signal = new AbortController().signal
    const query = {
      page: 2,
      limit: 10,
      search: ' Ada ',
      sort_by: 'name' as const,
      sort: 'asc' as const,
      statusCode: 'active',
      blank: '',
      nullable: null,
      enabled: false,
      zero: 0,
      tags: ['low', 'high'],
      details: { role: 'admin' },
      at,
    }
    const searchParameters = { page: 9, search: 'Context', statusCode: 'inactive', active: true }

    await expect(
      actions.list({
        query,
        searchParameters,
        signal,
      })
    ).resolves.toEqual({
      data: [{ id: '1', name: 'One' }],
      meta: { page: 1, pageSize: 10, total: 1, totalPage: 1 },
    })

    expect(requestQuery()).toEqual({
      page: '2',
      limit: '10',
      search: 'Ada',
      sort: 'name',
      order: 'asc',
      statusCode: 'active',
      enabled: 'false',
      zero: '0',
      tags: '["low","high"]',
      details: '{"role":"admin"}',
      at: String(at),
      active: 'true',
    })
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(signal)
    expect(query).toEqual({
      page: 2,
      limit: 10,
      search: ' Ada ',
      sort_by: 'name',
      sort: 'asc',
      statusCode: 'active',
      blank: '',
      nullable: null,
      enabled: false,
      zero: 0,
      tags: ['low', 'high'],
      details: { role: 'admin' },
      at,
    })
    expect(searchParameters).toEqual({ page: 9, search: 'Context', statusCode: 'inactive', active: true })

    await actions.list({ query: { sort_by: 'email', sort: 'desc' }, searchParameters: {} })
    expect(requestQuery(1)).toEqual({ sort: 'email', order: 'desc' })

    await actions.list({ query: {}, searchParameters: {} })
    expect(requestQuery(2)).toEqual({})

    await expect(actions.detail({ id: '1', searchParameters: {} })).resolves.toEqual({ id: '1', name: 'One' })
    const createInput = { name: 'Two', nested: { value: 'create' } }
    const updateInput = { name: 'Updated', nested: { value: 'update' } }
    await expect(actions.create(createInput)).resolves.toEqual({ id: '2', name: 'Two' })
    await expect(actions.update('1', updateInput)).resolves.toEqual({ id: '1', name: 'Updated' })
    await expect(actions.delete('1')).resolves.toEqual({ deleted: '1' })
    expect(await fetchMock.mock.calls.find(([input]) => String(input).includes('/rows/create'))?.[1]).toMatchObject({ body: JSON.stringify(createInput) })
    expect(await fetchMock.mock.calls.find(([input]) => String(input).includes('/rows/update/1'))?.[1]).toMatchObject({ body: JSON.stringify(updateInput) })
  })

  it('awaits one query parse for direct loader calls', async () => {
    let transforms = 0
    const directQuerySchema = z
      .object({
        ...collectionQueryFields,
        sort_by: z.enum(['name', 'email']).optional(),
      })
      .transform(async (query) => {
        transforms += 1
        await Promise.resolve()
        return query
      })
    const rpc = hc<typeof app>('https://api.test', { fetch: fetchMock })
    const actions = createHonoResourceActions(rpc.rows, { querySchema: directQuerySchema })

    await actions.list({ query: {}, searchParameters: { active: true } })

    expect(transforms).toBe(1)
    expect(requestQuery()).toEqual({ active: 'true' })

    await actions.list({ query: { sort_by: 'email' }, searchParameters: { active: false } })

    expect(transforms).toBe(2)
    expect(requestQuery(1)).toEqual({ sort: 'email', active: 'false' })
  })

  it('does not dispatch when the query schema rejects a sort key', async () => {
    const rpc = hc<typeof app>('https://api.test', { fetch: fetchMock })
    const actions = createHonoResourceActions(rpc.rows, { querySchema })

    await expect(actions.list({ query: { sort_by: 'statusCode' } as never, searchParameters: {} })).rejects.toMatchObject({
      issues: expect.any(Array),
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws the failed payload once', async () => {
    const rpc = hc<typeof app>('https://api.test', {
      fetch: async () => new Response(JSON.stringify({ error: 'bad' }), { status: 400 }),
    })
    const actions = createHonoResourceActions(rpc.rows, { querySchema })
    await expect(actions.list({ query: {}, searchParameters: {} })).rejects.toEqual({ error: 'bad' })
  })

  it('rejects an unknown resource route with a kebab-case hint', () => {
    const rpc = hc<typeof app>('https://api.test', { fetch: fetchMock })
    expect(() => createHonoResourceActions<typeof rpc.rows, typeof querySchema>(undefined as never, { querySchema })).toThrow(/kebab-case|rpc\[/)
    expect(() => createHonoResourceActions<typeof rpc.rows, typeof querySchema>({} as never, { querySchema })).toThrow(/kebab-case|rpc\[/)
    expect(() => createHonoResourceActions<typeof rpc.rows, typeof querySchema>({ list: rpc.rows.list } as never, { querySchema })).toThrow(/kebab-case|rpc\[/)
  })

  it('accepts hyphenated first segments', async () => {
    const rpc = hc<typeof app>('https://api.test', { fetch: fetchMock })
    const hyphenated = { 'coffee-variants': rpc.rows }
    const actions = createHonoResourceActions(hyphenated['coffee-variants'], { querySchema })
    await expect(actions.list({ query: {}, searchParameters: {} })).resolves.toEqual({
      data: [{ id: '1', name: 'One' }],
      meta: { page: 1, pageSize: 10, total: 1, totalPage: 1 },
    })
  })
})
