import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    fullBleed?: boolean
    requiresAuth?: boolean
    title?: string
    moduleName?: string
    /**
     * Declared by a child route: the `<resource>.<operation>` permission that
     * guards both the tab's visibility and direct entry by URL.
     */
    permission?: string
  }
}

export {}
