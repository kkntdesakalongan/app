import { load } from 'cheerio'

export type StationType = 'flood' | 'landslide' | 'tsunami'
export type StatusCode = 'normal' | 'warning' | 'maintenance' | 'unknown'

export interface Station {
  type: StationType
  name: string
  latitude: number
  longitude: number
  statusCode: StatusCode
  sourceStatus: string | null
  sourceIcon: string
  sourceUpdatedAt: string | null
  readings: {
    waterLevelMeters: number | null
    rainfallMm: number | null
    groundMovementCm: number | null
    humidityPercent: number | null
    batteryVolts: number | null
    sensorBatteryVolts: number | null
    hornOhms: number | null
  }
}

const sourceUrl = 'https://earlywarning-datacenter.net/?halaman=map'
const markers = /L\.marker\(\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\],\s*\{\s*icon:\s*(\w+)\s*\}\)\.addTo\(map\)\.bindPopup\('((?:\\.|[^'\\])*)'\)/g

export async function fetchStations(): Promise<{ fetchedAt: string; stations: Station[] }> {
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error('source_fetch_failed')
  const html = await response.text()
  const stations: Station[] = []
  for (const match of html.matchAll(markers)) {
    const [, latitude, longitude, icon, popup] = match
    if (!latitude || !longitude || !icon || popup === undefined) throw new Error('source_parse_failed')
    const type: StationType | null = icon.startsWith('Icon_banjir') ? 'flood' : icon.startsWith('Icon_longsor') ? 'landslide' : icon.startsWith('Icon_tsunami') ? 'tsunami' : null
    if (!type) throw new Error('source_parse_failed')
    const $ = load(popup.replace(/\\'/g, "'").replace(/\\\\/g, '\\'))
    const name = $('p').first().text().trim()
    const headers = $('thead td').map((_, element) => $(element).text().trim().toLowerCase()).get()
    const values = $('tbody th').map((_, element) => $(element).text().trim()).get()
    if (!name || headers.length === 0 || values.length !== headers.length) throw new Error('source_parse_failed')
    const value = (header: string) => values[headers.indexOf(header)] || null
    const number = (header: string) => {
      const text = value(header)
      if (!text) return null
      const result = /^\s*(-?\d+(?:\.\d+)?)\s*(?:cm|mm|m|%|v|ohm)?\s*$/i.exec(text)
      return result?.[1] ? Number(result[1]) : null
    }
    const sourceStatus = value('status')
    const statusCode: StatusCode = icon.toLowerCase().includes('warning') || icon.toLowerCase().includes('warn') ? 'warning' : icon.toLowerCase().includes('perbaikan') ? 'maintenance' : type === 'flood' && icon === 'Icon_banjir' && sourceStatus?.toLowerCase() === 'normal' ? 'normal' : 'unknown'
    stations.push({
      type, name, latitude: Number(latitude), longitude: Number(longitude), statusCode, sourceStatus, sourceIcon: icon,
      sourceUpdatedAt: value('update terakhir') ?? value('date'),
      readings: { waterLevelMeters: number('level air'), rainfallMm: number('curah hujan'), groundMovementCm: number('pergerakan tanah'), humidityPercent: number('kelembaban'), batteryVolts: number('accu') ?? number('accu utama') ?? number('accu (v)'), sensorBatteryVolts: number('accu sensor'), hornOhms: number('horn (ohm)') },
    })
  }
  const markerCount = [...html.matchAll(/L\.marker\s*\(/g)].length
  if (!stations.length || stations.length !== markerCount) throw new Error('source_parse_failed')
  return { fetchedAt: new Date().toISOString(), stations }
}
