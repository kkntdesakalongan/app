import type { RouteNamedMap } from 'vue-router/auto-routes'

/** Every route name the file-based router generates; single source for manifest typing. */
export type AppRouteName = keyof RouteNamedMap & string

export type StaticAppRouteName = {
  [Name in AppRouteName]: Record<never, never> extends RouteNamedMap[Name]["paramsRaw"] ? Name : never
}[AppRouteName]
