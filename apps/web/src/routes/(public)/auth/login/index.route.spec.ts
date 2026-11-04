import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), resolve: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
  refreshIdentity: vi.fn(),
  clearIdentity: vi.fn(),
  consumeRedirect: vi.fn(),
  resolvePostLoginRoute: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('@/assets/corporate/common/Logo.vue', () => ({ default: { name: 'Logo' } }))
vi.mock('@southneuhof/loom/components/base/Card.vue', () => ({ default: { name: 'Card' } }))
vi.mock('@southneuhof/loom/components/base/Toast.vue', () => ({ default: { name: 'Toast' } }))
vi.mock('@southneuhof/loom/components/base/Button.vue', () => ({ default: { name: 'Button' } }))
vi.mock('@southneuhof/loom/components/base/Spinner.vue', () => ({ default: { name: 'Spinner' } }))
vi.mock('@southneuhof/loom/components/inputs/TextInput.vue', () => ({ default: { name: 'TextInput' } }))
vi.mock('@southneuhof/loom/components/inputs/PasswordInput.vue', () => ({ default: { name: 'PasswordInput' } }))

vi.mock('@/framework/identity', () => ({
  refreshIdentity: mocks.refreshIdentity,
  clearIdentity: mocks.clearIdentity,
}))

vi.mock('@/utils/post-login-redirect', () => ({
  consumePostLoginRedirect: mocks.consumeRedirect,
}))

vi.mock('@/router/navigation', () => ({
  resolvePostLoginRoute: mocks.resolvePostLoginRoute,
}))

vi.mock('@/framework/rpc', () => ({
  rpc: {
    auth: { 'sign-in': { email: { $post: mocks.signIn } }, 'sign-out': { $post: mocks.signOut } },
  },
}))

const visualStub = (name: string) => defineComponent({ name, template: '<div><slot /></div>' })
const inputStub = (name: string) =>
  defineComponent({
    name,
    props: { modelValue: { type: String, default: '' } },
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  })
const buttonStub = defineComponent({
  name: 'Button',
  props: { disabled: { type: Boolean, default: false } },
  template: '<button :disabled="disabled"><slot /></button>',
})

import Login from './index.route.vue'

function response(ok: boolean, payload: unknown) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(payload),
  }
}

function mountLogin() {
  return mount(Login, {
    global: {
      stubs: {
        Logo: visualStub('Logo'),
        Card: visualStub('Card'),
        Toast: visualStub('Toast'),
        Button: buttonStub,
        Spinner: visualStub('Spinner'),
        TextInput: inputStub('TextInput'),
        PasswordInput: inputStub('PasswordInput'),
      },
    },
  })
}

describe('login route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.signOut.mockResolvedValue(undefined)
    mocks.consumeRedirect.mockReturnValue('/settings/users')
    mocks.resolvePostLoginRoute.mockReturnValue({ name: 'users' })
  })

  it('sends credentials, refreshes identity, and navigates once without storage', async () => {
    mocks.signIn.mockResolvedValue(response(true, { user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' } }))
    mocks.refreshIdentity.mockResolvedValue({
      userId: 'user-1',
      user: { id: 'user-1', name: 'Alice', email: 'alice@example.com', username: null, statusCode: 'active' },
      roleCodes: ['role-1'],
      permissions: ['view-users'],
    })

    const wrapper = mountLogin()
    const inputs = wrapper.findAll('input')
    await inputs[0]!.setValue('alice@example.com')
    await inputs[1]!.setValue('secret')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.signIn).toHaveBeenCalledWith({ json: { email: 'alice@example.com', password: 'secret' } })
    expect(mocks.refreshIdentity).toHaveBeenCalledOnce()
    expect(mocks.resolvePostLoginRoute).toHaveBeenCalledWith(mocks.router, '/settings/users')
    expect(mocks.router.push).toHaveBeenCalledExactlyOnceWith({ name: 'users' })
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()

    wrapper.unmount()
  })

  it('shows a controlled credential error and leaves state untouched after a failed sign-in response', async () => {
    mocks.signIn.mockResolvedValue(response(false, { message: 'Invalid credentials' }))

    const wrapper = mountLogin()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.refreshIdentity).not.toHaveBeenCalled()
    expect(mocks.router.push).not.toHaveBeenCalled()
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Email atau password tidak valid')
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()

    wrapper.unmount()
  })

  it('shows a controlled permission error and cleans up after a failed permission response', async () => {
    mocks.signIn.mockResolvedValue(response(true, { user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' } }))
    mocks.refreshIdentity.mockRejectedValue(new Error('Identity lookup failed'))

    const wrapper = mountLogin()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.refreshIdentity).toHaveBeenCalledOnce()
    expect(mocks.clearIdentity).toHaveBeenCalledOnce()
    expect(mocks.router.push).not.toHaveBeenCalled()
    expect(mocks.signOut).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Gagal memuat akses aplikasi. Silakan coba lagi')
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()

    wrapper.unmount()
  })

  it('shows a controlled connection error when sign-in cannot reach the server', async () => {
    mocks.signIn.mockRejectedValue(new Error('network details must stay hidden'))

    const wrapper = mountLogin()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.refreshIdentity).not.toHaveBeenCalled()
    expect(mocks.router.push).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Tidak dapat terhubung ke server. Silakan coba lagi')
    expect(wrapper.text()).not.toContain('network details must stay hidden')
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()

    wrapper.unmount()
  })

  it('allows an authenticated identity without system permissions', async () => {
    mocks.signIn.mockResolvedValue(response(true, { user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' } }))
    mocks.refreshIdentity.mockResolvedValue({
      userId: 'user-1',
      user: { id: 'user-1', name: 'Alice', email: 'alice@example.com', username: null, statusCode: 'active' },
      roleCodes: [],
      permissions: [],
    })

    const wrapper = mountLogin()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.refreshIdentity).toHaveBeenCalledOnce()
    expect(mocks.clearIdentity).not.toHaveBeenCalled()
    expect(mocks.router.push).toHaveBeenCalledOnce()
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()

    wrapper.unmount()
  })

  it('rejects a missing destination without persisting or navigating', async () => {
    mocks.signIn.mockResolvedValue(response(true, { user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' } }))
    mocks.refreshIdentity.mockResolvedValue({
      userId: 'user-1',
      user: { id: 'user-1', name: 'Alice', email: 'alice@example.com', username: null, statusCode: 'active' },
      roleCodes: ['role-1'],
      permissions: ['view-users'],
    })
    mocks.resolvePostLoginRoute.mockReturnValue(null)

    const wrapper = mountLogin()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.refreshIdentity).toHaveBeenCalledOnce()
    expect(mocks.clearIdentity).toHaveBeenCalledOnce()
    expect(mocks.router.push).not.toHaveBeenCalled()
    expect(mocks.signOut).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Tidak ada halaman yang dapat diakses oleh akun ini')
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()

    wrapper.unmount()
  })

  it('keeps the primary error when session cleanup fails', async () => {
    mocks.signIn.mockResolvedValue(response(true, { user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' } }))
    mocks.refreshIdentity.mockRejectedValue(new Error('Identity lookup failed'))
    mocks.signOut.mockRejectedValue(new Error('cleanup details must stay hidden'))

    const wrapper = mountLogin()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.clearIdentity).toHaveBeenCalledOnce()
    expect(mocks.signOut).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Gagal memuat akses aplikasi. Silakan coba lagi')
    expect(wrapper.text()).not.toContain('cleanup details must stay hidden')
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()

    wrapper.unmount()
  })
})
