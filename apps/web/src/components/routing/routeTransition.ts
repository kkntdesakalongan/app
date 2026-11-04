import type { InjectionKey } from 'vue'

export const routeLeaveCleanup: InjectionKey<(cleanup: () => void) => void> = Symbol('route-leave-cleanup')
