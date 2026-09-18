import { Hono } from 'hono'
import { hc } from 'hono/client'
import { validator } from 'hono/validator'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHonoResourceActions } from './actions'

const app = new Hono()
  .get(
    '/rows/list',
    validator('query', (value) => value as { page?: string; search?: string; blank?: string; statusCode?: string; at?: string }),
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

afterEach(() => fetchMock.mockClear())

describe('createHonoResourceActions', () => {
  it('normalizes standard actions and serializes query and identity', async () => {
    const rpc = hc<typeof app>('https://api.test', { fetch: fetchMock })
    const actions = createHonoResourceActions(rpc.rows)

    const at = new Date('2026-08-26T00:00:00.000Z')
    await expect(actions.list({ query: { page: 2, blank: '', statusCode: [{ id: 'low', name: 'Low' }], at } as never, searchParameters: { search: 'one' } })).resolves.toEqual({
      data: [{ id: '1', name: 'One' }],
      meta: { page: 1, pageSize: 10, total: 1, totalPage: 1 },
    })
    await expect(actions.detail({ id: '1', searchParameters: {} })).resolves.toEqual({ id: '1', name: 'One' })
    const createInput = { name: 'Two', nested: { value: 'create' } }
    const updateInput = { name: 'Updated', nested: { value: 'update' } }
    await expect(actions.create(createInput)).resolves.toEqual({ id: '2', name: 'Two' })
    await expect(actions.update('1', updateInput)).resolves.toEqual({ id: '1', name: 'Updated' })
    await expect(actions.delete('1')).resolves.toEqual({ deleted: '1' })
    const listRequest = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(listRequest.searchParams.get('search')).toBe('one')
    expect(listRequest.searchParams.get('statusCode')).toBe('[{"id":"low","name":"Low"}]')
    expect(listRequest.searchParams.get('at')).toBe(String(at))
    expect(await fetchMock.mock.calls.find(([input]) => String(input).includes('/rows/create'))?.[1]).toMatchObject({ body: JSON.stringify(createInput) })
    expect(await fetchMock.mock.calls.find(([input]) => String(input).includes('/rows/update/1'))?.[1]).toMatchObject({ body: JSON.stringify(updateInput) })
  })

  it('throws the failed payload once', async () => {
    const rpc = hc<typeof app>('https://api.test', { fetch: async () => new Response(JSON.stringify({ error: 'bad' }), { status: 400 }) })
    const actions = createHonoResourceActions(rpc.rows)
    await expect(actions.list({ query: {}, searchParameters: {} })).rejects.toEqual({ error: 'bad' })
  })

  it('rejects an unknown resource route with a kebab-case hint', () => {
    expect(() => createHonoResourceActions(undefined as never)).toThrow(/kebab-case|rpc\[/)
    expect(() => createHonoResourceActions({} as never)).toThrow(/kebab-case|rpc\[/)
    const rpc = hc<typeof app>('https://api.test', { fetch: fetchMock })
    expect(() => createHonoResourceActions({ list: rpc.rows.list } as never)).toThrow(/kebab-case|rpc\[/)
  })

  it('accepts hyphenated first segments', async () => {
    const rpc = hc<typeof app>('https://api.test', { fetch: fetchMock })
    const hyphenated = { 'coffee-variants': rpc.rows }
    const actions = createHonoResourceActions(hyphenated['coffee-variants'])
    await expect(actions.list({ query: {}, searchParameters: {} })).resolves.toEqual({
      data: [{ id: '1', name: 'One' }],
      meta: { page: 1, pageSize: 10, total: 1, totalPage: 1 },
    })
  })
})
