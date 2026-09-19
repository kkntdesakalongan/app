import type { Router } from 'vue-router'
import type { AccessAdapter, FrameworkAdaptersInput, UiAdapter } from '@southneuhof/loom'
import { isDeclaredCustomOperation, isStandardRowOperation } from '@southneuhof/loom'
import { dataAdapter } from './data/normalize'
import { createRouteQueryAdapter } from './query/routeQuery'
import { useColorPreference } from '@/stores/colorpreference'
import { permissions } from '@/stores/permissions'

/** True when the server-declared record operations include the operation. */
export function recordAllows(record: unknown, operation: string): boolean {
  const operations = (record as { allowedOperations?: unknown } | undefined)?.allowedOperations
  return Array.isArray(operations) && operations.includes(operation)
}

/** Uses server operations for row-scoped records and memory permissions elsewhere. */
export const accessAdapter: AccessAdapter = {
  allows: ({ operation, permission, record }) => {
    const declared = (record as { allowedOperations?: unknown } | undefined)?.allowedOperations
    if (Array.isArray(declared) && (isStandardRowOperation(operation) || isDeclaredCustomOperation(operation))) {
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

/**
 * Project-specific adapter bundle installed with the framework plugin.
 *
 * There is no `schemas` adapter: resources declare `schemas` directly from the API
 * entity modules, which is the documented path and the only one now that the mirror
 * is gone. `SchemaAdapter` remains an optional framework seam for projects whose
 * schemas do not travel with their resource definitions.
 */
export function createFrameworkAdapters(router: Router): FrameworkAdaptersInput {
  return {
    data: dataAdapter,
    access: accessAdapter,
    query: createRouteQueryAdapter(router),
    queryDefaults: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    ui: uiAdapter,
  }
}
