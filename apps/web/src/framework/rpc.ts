import { createRpcClient } from '@southneuhof/sdk'

const apiOrigin = new URL(import.meta.env.VITE_API_URL || '/', window.location.origin).origin
export const apiUrl = `${apiOrigin}/api/`
export const rpc = createRpcClient(apiUrl)
