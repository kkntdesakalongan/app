import type { RouteLocationNormalizedLoaded, RouteLocationRaw, Router } from 'vue-router'
import { activeNavigationEntry, type VisibleNavigationModule } from '@/manifest'

export type BreadcrumbItem = { label: string; to?: RouteLocationRaw }

const pageLabels: Record<string, string> = {
  create: 'Create',
  detail: 'Detail',
  edit: 'Edit',
  permissions: 'Permissions',
  roles: 'Roles',
}

function titleCase(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function routeBreadcrumbs(route: RouteLocationNormalizedLoaded, router: Pick<Router, 'resolve'>, navigation: readonly VisibleNavigationModule[]): BreadcrumbItem[] {
  const routeName = String(route.name ?? '')
  const match = activeNavigationEntry(route.path, (to) => router.resolve(to), navigation)

  if (!match) return [{ label: titleCase(routeName || 'Page') }]

  const items: BreadcrumbItem[] = []
  if (match.module.title !== match.entry.title) items.push({ label: match.module.title })
  const isEntrypoint = routeName === match.entry.name
  items.push({ label: match.entry.title, ...(isEntrypoint ? {} : { to: match.entry.to }) })

  if (!isEntrypoint) {
    const suffix = routeName.slice(match.entry.name.length).split('-').filter(Boolean)
    for (const segment of suffix) {
      const label = pageLabels[segment] ?? titleCase(segment)
      if (items.at(-1)?.label !== label) items.push({ label })
    }
  }
  return items
}
