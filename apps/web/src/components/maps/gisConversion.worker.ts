import { convertGisBytes } from './gisConversionCore'

self.onmessage = async (event: MessageEvent<{ bytes: ArrayBuffer; filename: string; code: string; wasmUrl: string }>) => {
  try {
    const { bytes, filename, code, wasmUrl } = event.data
    self.postMessage({ data: await convertGisBytes(bytes, filename, code, wasmUrl) })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Konversi data GIS gagal.' })
  }
}
