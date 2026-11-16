import { createHonoResourceActions } from '@/framework/hono'
import { rpc } from '@/framework/rpc'

export const publicCategoryActions = createHonoResourceActions(rpc.public)
export const categoryField = {
  renderer: 'select',
  label: 'Kategori Laporan',
  props: { load: publicCategoryActions['report-categories'], pick: 'id', view: 'name' },
} as const
