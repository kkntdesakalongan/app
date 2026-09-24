import { describe, expect, it } from 'vitest'
import { createUserFormSchema } from './users.schema'

describe('user creation schema', () => {
  it('maps selected role records to unique role IDs', () => {
    expect(
      createUserFormSchema.parse({
        name: ' Ada ',
        email: 'ada@example.test',
        password: 'long-password',
        roleIds: [{ id: ' admin ' }, 'editor'],
      })
    ).toEqual({
      name: 'Ada',
      email: 'ada@example.test',
      password: 'long-password',
      roleIds: ['admin', 'editor'],
    })
  })

  it('rejects repeated role IDs after selection values are normalized', () => {
    expect(
      createUserFormSchema.safeParse({
        name: 'Ada',
        email: 'ada@example.test',
        password: 'long-password',
        roleIds: [{ id: ' admin ' }, 'admin'],
      }).success
    ).toBe(false)
  })
})
