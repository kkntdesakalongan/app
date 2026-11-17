import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import type { GisFeatureCollection } from './gisConversionCore'

export type { GisFeatureCollection } from './gisConversionCore'

export async function convertGisFile(file: File, code: string, signal?: AbortSignal): Promise<GisFeatureCollection> {
  if (file.size > 25 * 1024 * 1024) throw new Error('Ukuran berkas maksimal 25 MiB.')
  if (signal?.aborted) throw new DOMException('Konversi dibatalkan.', 'AbortError')
  const bytes = await file.arrayBuffer()
  if (signal?.aborted) throw new DOMException('Konversi dibatalkan.', 'AbortError')
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./gisConversion.worker.ts', import.meta.url), { type: 'module' })
    const abort = () => {
      finish()
      reject(new DOMException('Konversi dibatalkan.', 'AbortError'))
    }
    const finish = () => {
      signal?.removeEventListener('abort', abort)
      worker.terminate()
    }
    signal?.addEventListener('abort', abort, { once: true })
    worker.onmessage = (event: MessageEvent<{ data?: GisFeatureCollection; error?: string }>) => {
      finish()
      if (event.data.error) reject(new Error(event.data.error))
      else if (event.data.data) resolve(event.data.data)
      else reject(new Error('Hasil konversi tidak tersedia.'))
    }
    worker.onerror = () => {
      finish()
      reject(new Error('Konversi data GIS gagal.'))
    }
    worker.postMessage({ bytes, filename: file.name, code, wasmUrl: new URL(wasmUrl, window.location.href).href }, [bytes])
  })
}
