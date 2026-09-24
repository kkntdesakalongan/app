import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { configureParser, parse } from '@southneuhof/utilities/parse'
import { beginPageReadiness, FrameworkPlugin, markPageNavigationSettled, setPageReadinessError } from '@southneuhof/loom'
import { FileManagerPlugin } from '@southneuhof/loom/file-manager'
import { createFrameworkAdapters } from './framework/adapters/bundle'
import { fileManagerOptions } from './framework/adapters/fileManager'
import { appDisplayRenderers } from './framework/display/renderers'
import { appInputProps } from './framework/inputs/registry'
import { dictionary } from '@/configs/dictionary'
import App from './App.vue'
import router from './router'
import '@vuepic/vue-datepicker/dist/main.css'
import './assets/main.css'
import '@southneuhof/loom/styles/state-layers.css'
import 'vue-sonner/style.css'
import 'remixicon/fonts/remixicon.css'
import VueTippy from 'vue-tippy'
import 'tippy.js/dist/tippy.css' // optional for styling

const app = createApp(App)
beginPageReadiness()
router.beforeEach(() => beginPageReadiness())
router.afterEach(() => markPageNavigationSettled())
router.onError((error) => setPageReadinessError(error))
configureParser({ dictionary })
declare module 'vue' {
  export interface ComponentCustomProperties {
    $parse: (key: string, value: string | number, mode?: 'dictionary' | 'parser') => any
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  app.use(createPinia())
  app.use(FrameworkPlugin, {
    adapters: createFrameworkAdapters(router),
    renderers: { display: appDisplayRenderers },
    inputProps: appInputProps,
    uiDefaults: { backLabel: 'Kembali' },
  })
  app.use(FileManagerPlugin, fileManagerOptions)
  app.use(router)
  app.use(
    VueTippy,
    // optional
    {
      directive: 'tippy', // => v-tippy
      component: 'tippy', // => <tippy/>
      componentSingleton: 'tippy-singleton', // => <tippy-singleton/>,
      defaultProps: {
        placement: 'top',
        allowHTML: true,
      }, // => Global default options * see all props
    }
  )
  app.config.globalProperties.$parse = parse

  app.config.errorHandler = (err, vm, info) => {
    console.error('Global error handler :: ', err)
    // Handle the error (e.g., log it, show a notification, etc.)
  }

  await router.isReady()
  app.mount('#app')
})
