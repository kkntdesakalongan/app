import type { Router } from 'vue-router'
import type { AccessAdapter, FrameworkAdaptersInput, UiAdapter } from '@southneuhof/loom'
import { isStandardRowOperation } from '@southneuhof/loom'
import { dataAdapter } from './data/normalize'
import { createRouteQueryAdapter } from './query/routeQuery'
import { useColorPreference } from '@/stores/colorpreference'
import { permissions } from '@/stores/permissions'
import { assetAdapter } from './assets'

/** True when the server-declared record operations include the operation. */
export function recordAllows(record: unknown, operation: string): boolean {
  const operations = (record as { allowedOperations?: unknown } | undefined)?.allowedOperations
  return Array.isArray(operations) && operations.every((name: unknown) => typeof name === 'string' && name.length > 0) && operations.includes(operation)
}

function hasOperationDeclaration(record: unknown): record is Record<string, unknown> {
  return typeof record === 'object' && record !== null && !Array.isArray(record) && Object.hasOwn(record, 'allowedOperations')
}

/** Uses server operations for row-scoped records and memory permissions elsewhere. */
export const accessAdapter: AccessAdapter = {
  allows: ({ operation, permission, record }) => {
    if (isStandardRowOperation(operation) && hasOperationDeclaration(record)) {
      return recordAllows(record, operation)
    }
    return allowsPermission(permission)
  },
}

/** Reads the exact permission code returned by the server. */
export function allowsPermission(permission: string | null | undefined): boolean {
  if (!permission) return true
  return permissions().can(permission)
}

/** Theme lives in the app Pinia store; date pickers read it through this adapter. */
export const uiAdapter: UiAdapter = {
  colorPreference: () => ({ value: useColorPreference().value }),
}

export function createFrameworkAdapters(router: Router): FrameworkAdaptersInput {
  return {
    data: dataAdapter,
    access: accessAdapter,
    query: createRouteQueryAdapter(router),
    queryDefaults: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    ui: uiAdapter,
    assets: assetAdapter,
  }
}
