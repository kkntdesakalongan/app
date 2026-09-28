import { createApp, defineComponent, nextTick, type App, type VNode } from 'vue'
import type { AccessRequest } from '@southneuhof/loom'
import { FrameworkPlugin, createFrameworkQueryClient } from '@southneuhof/loom'

const mounted: Array<{ app: App; host: HTMLElement }> = []

export function mountFramework(render: () => VNode, allows: (request: AccessRequest) => boolean = () => true) {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp(defineComponent({ setup: () => () => render() }))
  app.use(FrameworkPlugin, {
    queryClient: createFrameworkQueryClient({ retry: 0, staleTime: 0 }),
    adapters: { access: { allows } },
  })
  app.mount(host)
  mounted.push({ app, host })
  return { app, host }
}

export async function settleForm(): Promise<void> {
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await nextTick()
}

export function openField(label: string): HTMLElement {
  const field = [...document.querySelectorAll<HTMLElement>('.is-form-field')]
    .find((element) => element.querySelector('label')?.textContent?.includes(label))
  const trigger = field?.querySelector<HTMLElement>('[class*="focus-within:outline-secondary"]')
  if (!trigger) throw new Error(`SelectInput trigger was not found for ${label}.`)
  trigger.click()
  return trigger
}

export async function chooseOption(name: string): Promise<void> {
  await settleForm()
  const popover = document.querySelector<HTMLElement>('[data-reka-popper-content-wrapper]')
  if (!popover) throw new Error('SelectInput did not render its option popover.')
  const option = [...popover.querySelectorAll<HTMLElement>('[role="button"]')]
    .find((element) => element.textContent?.trim() === name)
  if (!option) throw new Error(`SelectInput did not render the ${name} option.`)
  option.click()
  await settleForm()
}

export function cleanupFramework(): void {
  mounted.splice(0).forEach(({ app, host }) => {
    app.unmount()
    host.remove()
  })
  document.body.innerHTML = ''
}
