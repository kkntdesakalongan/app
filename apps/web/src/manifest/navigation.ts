import { defineNavigation, type NavigationDirect, type NavigationEntry, type NavigationIcon, type NavigationModule } from './contract'

export const navigation = defineNavigation([
  { kind: 'standalone', name: 'dashboard', title: 'Dashboard', icon: 'home', description: 'Dashboard', routes: [{ to: { name: 'dashboard' }, permission: null, title: 'Dashboard', icon: 'home' }] },
  {
    kind: 'module',
    name: 'settings',
    title: 'Settings',
    icon: 'settings',
    description: 'Settings',
    routes: [
      { to: { name: 'settings-users' }, permission: 'view-users', title: 'Users', icon: 'folder' },
      { to: { name: 'settings-roles' }, permission: 'view-roles', title: 'Roles', icon: 'folder' },
      { to: { name: 'settings-permissions' }, permission: 'view-permissions', title: 'Permissions', icon: 'folder' },
    ],
  },
] as const satisfies readonly NavigationModule[])

export type VisibleNavigationRoute = { name: string; to: NavigationDirect['to']; title: string; icon: NavigationIcon; aliases?: readonly string[] }
export type VisibleNavigationEntry = { separator: true; name: string } | VisibleNavigationRoute
export type VisibleNavigationModule = Omit<(typeof navigation)[number], 'routes'> & { routes: VisibleNavigationEntry[] }

export function visibleNavigation(allows: (permission: string) => boolean): VisibleNavigationModule[] {
  return navigation.flatMap((module) => {
    const routes: VisibleNavigationEntry[] = []
    const entries: readonly NavigationEntry[] = module.routes
    for (const entry of entries) {
      if ('separator' in entry) {
        if (routes.length && !('separator' in routes.at(-1)!)) routes.push({ separator: true, name: entry.separator })
        continue
      }
      if (!('to' in entry)) continue
      const permission: string | null = entry.permission
      if (permission !== null && !allows(permission)) continue
      const to = entry.to
      const aliases = entry.aliases
      routes.push({ name: to.name, to, title: entry.title, icon: entry.icon, ...(aliases ? { aliases } : {}) })
    }
    if (routes.at(-1) && 'separator' in routes.at(-1)!) routes.pop()
    return routes.length ? [{ ...module, routes }] : []
  })
}

export function matchesNavigationPath(path: string, entryPath: string) {
  return path === entryPath || path.startsWith(`${entryPath}/`)
}

export function activeNavigationEntry(
  path: string,
  resolve: (to: VisibleNavigationRoute['to']) => { path: string },
  modules: readonly VisibleNavigationModule[]
): { module: VisibleNavigationModule; entry: VisibleNavigationRoute } | undefined {
  let match: { module: VisibleNavigationModule; entry: VisibleNavigationRoute; pathLength: number } | undefined
  for (const module of modules) {
    for (const entry of module.routes) {
      if ('separator' in entry) continue
      const entryPath = resolve(entry.to).path
      if (matchesNavigationPath(path, entryPath) && (!match || entryPath.length > match.pathLength)) {
        match = { module, entry, pathLength: entryPath.length }
      }
    }
  }
  return match ? { module: match.module, entry: match.entry } : undefined
}

export function activeNavigationModule(path: string, resolve: (to: VisibleNavigationRoute['to']) => { path: string }, allows: (permission: string) => boolean): string | undefined {
  return activeNavigationEntry(path, resolve, visibleNavigation(allows))?.module.name
}
