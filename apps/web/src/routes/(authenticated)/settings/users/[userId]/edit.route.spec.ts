import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  detail: vi.fn(),
  update: vi.fn(),
  confirm: vi.fn(),
  input: { name: 'Updated user', statusCode: 'non_active' as const },
}))

vi.stubGlobal('confirm', mocks.confirm)
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { userId: 'u1' } }) }))
vi.mock('../users.resource', () => ({
  users: {
    detail: vi.fn(() => ({ detail: { load: mocks.detail } })),
    update: vi.fn(() => ({ form: { submit: mocks.update } })),
  },
}))
vi.mock('@southneuhof/loom', async () => {
  const { h } = await import('vue')
  return {
    FormView: {
      props: { form: { type: Object, required: true } },
      setup(props: { form: { submit: (input: unknown) => unknown } }) {
        return () =>
          h(
            'button',
            {
              onClick: () => void Promise.resolve(props.form.submit(mocks.input)).catch(() => undefined),
            },
            'submit'
          )
      },
    },
  }
})

const Route = (await import('./edit.route.vue')).default

beforeEach(() => {
  mocks.detail.mockResolvedValue({ id: 'u1', statusCode: 'active' })
  mocks.update.mockResolvedValue({ id: 'u1', ...mocks.input })
  mocks.confirm.mockReset()
  Object.assign(mocks.input, { statusCode: 'non_active' })
})

describe('user edit status confirmation', () => {
  it('does not send a request when disabling is cancelled', async () => {
    mocks.confirm.mockReturnValue(false)
    const wrapper = mount(Route)
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(mocks.confirm).toHaveBeenCalledWith('Disabling this user will end all active sessions. Continue?')
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('sends the canonical update after confirmation', async () => {
    mocks.confirm.mockReturnValue(true)
    const wrapper = mount(Route)
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(mocks.update).toHaveBeenCalledWith(mocks.input)
  })

  it('does not ask for confirmation for an ordinary update', async () => {
    Object.assign(mocks.input, { statusCode: 'active' })
    const wrapper = mount(Route)
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(mocks.confirm).not.toHaveBeenCalled()
    expect(mocks.update).toHaveBeenCalledWith(mocks.input)
  })
})
