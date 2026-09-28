import { z } from 'zod/v4'
import { defineResource, defineTable } from '@southneuhof/loom'
import { listRequests, verifyRequest, type RequestRecord, type VerifyInput } from './loom-row-command.services'

const requestSchema = z.object({ id: z.string(), status: z.string(), allowedOperations: z.array(z.string()) })
const requestTable = defineTable({
  schema: requestSchema,
  columns: { id: {}, status: {} },
})

export const requestResource = defineResource({
  key: 'loom-eval-requests',
  identity: (record: Pick<RequestRecord, 'id'>) => record.id,
  list: {
    permission: null,
    table: { ...requestTable, load: listRequests },
  },
  actions: {
    verify: {
      permission: 'requests.verify',
      run: verifyRequest,
    },
  },
})

export function verifyRow(record: RequestRecord, input: VerifyInput) {
  return requestResource.actions.verify.withContext({ record }).run(input)
}
