import type { Feature } from 'geojson'
import type { PathOptions } from 'leaflet'
export const hazardLegend = [
  { label: 'Rendah', color: '#16a34a' },
  { label: 'Sedang', color: '#eab308' },
  { label: 'Tinggi', color: '#dc2626' },
  { label: 'Tidak tersedia', color: '#64748b' },
]
export const landUseLegend = [
  { label: 'Alun-Alun', color: '#84cc16' },
  { label: 'Gedung', color: '#7c3aed' },
  { label: 'Hutan', color: '#166534' },
  { label: 'Jalan', color: '#475569' },
  { label: 'Ladang', color: '#a16207' },
  { label: 'Makam', color: '#a3a3a3' },
  { label: 'Pemukiman', color: '#c026d3' },
  { label: 'Perkebunan', color: '#65a30d' },
  { label: 'Sawah Irigasi', color: '#22c55e' },
  { label: 'Sawah Tadah Hujan', color: '#a3e635' },
  { label: 'Sekolah', color: '#ea580c' },
  { label: 'Semak Belukar', color: '#4d7c0f' },
  { label: 'Sungai', color: '#0284c7' },
  { label: 'Tanah Kosong', color: '#d6b48c' },
  { label: 'Tempat Ibadah', color: '#e11d48' },
  { label: 'Tubuh Air', color: '#1d4ed8' },
  { label: 'Tidak tersedia', color: '#64748b' },
]
export const populationLegend = [
  { label: '0 jiwa', color: '#e2e8f0' },
  { label: '1–10 jiwa', color: '#93c5fd' },
  { label: '11–100 jiwa', color: '#3b82f6' },
  { label: '101–1.000 jiwa', color: '#1d4ed8' },
  { label: 'Lebih dari 1.000 jiwa', color: '#172554' },
  { label: 'Tidak tersedia', color: '#64748b' },
]
export function gisLegend(id: string) {
  if (id === 'bahaya') return hazardLegend
  if (id === 'penggunaan-lahan') return landUseLegend
  if (id === 'estimasi-penduduk') return populationLegend
  return [
    {
      label: id === 'area-longsor' ? 'Area longsor' : id === 'area-terdampak' ? 'Area terdampak' : 'Batas persil',
      color: id === 'area-longsor' ? '#c2410c' : id === 'area-terdampak' ? '#be123c' : '#475569',
    },
  ]
}
export function gisStyle(id: string, feature?: Feature): PathOptions {
  const entries = gisLegend(id)
  const properties = feature?.properties
  let entry = entries[0]
  if (id === 'bahaya') entry = hazardLegend[properties?.hazardClass === 'RENDAH' ? 0 : properties?.hazardClass === 'SEDANG' ? 1 : properties?.hazardClass === 'TINGGI' ? 2 : 3]
  if (id === 'penggunaan-lahan') entry = landUseLegend.find((item) => item.label === properties?.landUse) ?? landUseLegend[landUseLegend.length - 1]
  if (id === 'estimasi-penduduk') {
    const value = properties?.estimatedPopulation
    entry = populationLegend[typeof value !== 'number' ? 5 : value === 0 ? 0 : value <= 10 ? 1 : value <= 100 ? 2 : value <= 1000 ? 3 : 4]
  }
  return { color: entry.color, weight: id === 'persil-tanah' ? 1 : 2, fillOpacity: id === 'persil-tanah' ? 0 : 0.4 }
}
