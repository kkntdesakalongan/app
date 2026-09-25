import { createFrameworkQueryClient, defineDetail, defineForm, FrameworkPlugin, Form, Detail } from '@southneuhof/loom'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { z } from 'zod/v4'
import { describe, expect, it, vi } from 'vitest'
import { appDisplayRenderers } from '../framework/display/renderers'

describe('app labels', () => {
  it('updates labels without changing the input or displayed value', async () => {
    const label = ref('Name')
    const submitted = vi.fn()
    const form = defineForm({
      schema: z.object({ name: z.string() }),
      fields: { name: { renderer: 'text' } },
      labels: { name: () => label.value },
      submit: async (value) => {
        submitted(value)
        return value
      },
    })
    const detail = defineDetail({
      schema: z.object({ name: z.string() }),
      fields: { name: {} },
      labels: { name: () => label.value },
    })
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(defineComponent(() => () => h('div', [h(Form, { ...form, initialData: { name: 'Ada' } }), h(Detail, { ...detail, data: { name: 'Ada' } })])))
    app.use(FrameworkPlugin, {
      renderers: { display: appDisplayRenderers },
      queryClient: createFrameworkQueryClient({ retry: 0, staleTime: 0 }),
    })
    app.mount(host)

    await nextTick()
    const input = host.querySelector<HTMLInputElement>('input')!
    expect(host.querySelector('label')?.textContent).toBe('Name *')
    expect(host.querySelector('tbody th')?.textContent).toBe('Name')
    expect(input.type).toBe('text')
    expect(input.value).toBe('Ada')
    expect(host.querySelector('tbody')?.textContent).toContain('Ada')

    label.value = 'Person name'
    await nextTick()

    expect(host.querySelector('label')?.textContent).toBe('Person name *')
    expect(host.querySelector('tbody th')?.textContent).toBe('Person name')
    expect(input.type).toBe('text')
    expect(input.value).toBe('Ada')
    expect(host.querySelector('tbody')?.textContent).toContain('Ada')

    host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click()
    await nextTick()
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(submitted).toHaveBeenCalledWith({ name: 'Ada' })
    app.unmount()
    host.remove()
  })
})
