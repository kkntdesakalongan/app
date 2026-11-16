import type { Context } from 'hono'

export function categoryReferenceError({ c, error }: { c: Context; error: unknown }) {
  for (let current = error; current instanceof Error; current = current.cause) {
    if ('code' in current && current.code === '23503' && 'constraint' in current && current.constraint === 'disaster_reports_category_id_report_categories_id_fkey') {
      if (c.req.method === 'DELETE') {
        return c.json({ error: 'conflict', message: 'Kategori Laporan masih digunakan oleh laporan.' }, 409)
      }
      return c.json({ error: 'validation_error', message: 'Pilih Kategori Laporan yang tersedia.', issues: [{ field: 'categoryId', message: 'Pilih Kategori Laporan yang tersedia.' }] }, 400)
    }
  }
}
