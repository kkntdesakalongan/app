import { loadIdentity } from '@/framework/identity'
import { savePostLoginRedirect } from '@/utils/post-login-redirect'
import { getDefaultAuthenticatedRouteLocation } from './navigation'
import { evaluateResourceRouteAccess, useResourceRuntime, type AccessAdapter } from '@southneuhof/loom'
import type { NavigationGuard } from 'vue-router'

function allowsExtraordinaryRoute(meta: { permission?: string }, access: AccessAdapter): boolean {
  return !meta.permission || access.allows({ operation: 'detail', permission: meta.permission })
}

/** Enforces ordinary route permission metadata on direct URL entry. */
export function createPermissionGuard(access?: AccessAdapter): NavigationGuard {
  return (to) => {
    const adapter = access ?? useResourceRuntime().adapters.access
    const routeAccess = typeof to.name === 'string' ? evaluateResourceRouteAccess(to.name, adapter) : undefined
    const allowed = routeAccess ?? allowsExtraordinaryRoute(to.meta, adapter)
    return allowed ? true : ((getDefaultAuthenticatedRouteLocation() ?? { path: '/' }) as never)
  }
}

export function createAuthGuard(): NavigationGuard {
  return async (to) => {
    const isHome = to.path === '/'
    const needsIdentity = isHome || to.name === 'auth-login' || Boolean(to.meta.requiresAuth)
    if (!needsIdentity) return true

    let authenticated = false
    try {
      authenticated = Boolean(await loadIdentity())
    } catch (_) {
      return isHome ? { name: 'map' } : true
    }

    if (isHome) {
      return (authenticated ? getDefaultAuthenticatedRouteLocation() : null) ?? { name: 'map' }
    }

    if (authenticated && to.name === 'auth-login') {
      return getDefaultAuthenticatedRouteLocation() ?? true
    }

    if (to.meta.requiresAuth && !authenticated) {
      savePostLoginRedirect(to.fullPath)
      return { name: 'auth-login' } as never
    }

    return true
  }
}
