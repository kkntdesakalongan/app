import { describe, expect, it } from 'vitest'
import { roleCreateSchema } from '@southneuhof/api/src/routes/(authenticated)/roles/schema.ts'
import { createUserSchema, userCreateSchema, userSelectSchema } from '@southneuhof/api/src/routes/(authenticated)/users/schema.ts'

describe('backend module schema validation', () => {
  it('accepts valid table-derived user and role input', () => {
    expect(userCreateSchema.safeParse({ name: 'Ada', email: 'ada@example.test' }).success).toBe(true)
    expect(roleCreateSchema.safeParse({ roleCode: 'admin', name: 'Administrator' }).success).toBe(true)
  })

  it('rejects a role input without its required code', () => {
    const result = roleCreateSchema.safeParse({ name: 'Administrator' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.map((issue) => issue.path.join('.'))).toContain('roleCode')
  })

  it('normalizes user creation input and rejects duplicate roles', () => {
    const valid = createUserSchema.parse({
      name: ' Ada ',
      email: 'ada@example.test',
      password: 'long-password',
      roleIds: ['admin', 'editor'],
    })

    expect(valid).toEqual({
      name: 'Ada',
      email: 'ada@example.test',
      password: 'long-password',
      roleIds: ['admin', 'editor'],
    })
    expect(
      createUserSchema.safeParse({
        name: 'Ada',
        email: 'ada@example.test',
        password: 'long-password',
        roleIds: ['admin', ' admin '],
      }).success
    ).toBe(false)
  })

  it('rejects a user record with an invalid status', () => {
    const result = userSelectSchema.safeParse({
      id: 'user-1',
      name: 'Ada',
      email: 'ada@example.test',
      emailVerified: false,
      image: null,
      statusCode: 'suspended',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.map((issue) => issue.path.join('.'))).toContain('statusCode')
  })
})
