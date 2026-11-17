import initSqlJs from 'sql.js'
import proj4 from 'proj4'
import shp from 'shpjs'
import { z } from 'zod/v4'
import type { Feature, Polygon, MultiPolygon } from 'geojson'
import { gisCodeSchema, gisDatasetUpdateSchema, type GisFeatureCollection } from '@southneuhof/api/src/routes/(authenticated)/gis-data/schema.ts'

export type { GisFeatureCollection } from '@southneuhof/api/src/routes/(authenticated)/gis-data/schema.ts'

const position = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)])
const ring = z
  .array(position)
  .min(4)
  .refine((points) => points[0][0] === points[points.length - 1][0] && points[0][1] === points[points.length - 1][1], 'Batas poligon harus tertutup.')
const polygon = z.array(ring).min(1)
const geometry = z.discriminatedUnion('type', [z.object({ type: z.literal('Polygon'), coordinates: polygon }), z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(polygon).min(1) })])
const inputFeature = z.object({ type: z.literal('Feature'), id: z.union([z.number(), z.string()]).optional(), geometry, properties: z.record(z.string(), z.unknown()).nullable() })
const collection = z.object({ type: z.literal('FeatureCollection'), features: z.array(inputFeature).min(1).max(50000) })
type DatasetCode = z.infer<typeof gisCodeSchema>

const nullableText = z.string().nullable()
const nullableNumber = z.number().finite().nonnegative().nullable()
const parcelIdentity = z.union([z.string(), z.number().finite(), z.null()])
const hazardClass = z.enum(['RENDAH', 'SEDANG', 'TINGGI'])

function canonicalProperties(code: DatasetCode, properties: Record<string, unknown>, canonicalOnly = false) {
  switch (code) {
    case 'bahaya': {
      if (canonicalOnly || 'hazardClass' in properties) return z.object({ hazardClass }).parse(properties)
      const source = z.object({ KELAS_3: hazardClass }).parse(properties)
      return { hazardClass: source.KELAS_3 }
    }
    case 'keterpaparan': {
      if (canonicalOnly || 'landUse' in properties) return z.object({ landUse: z.string(), estimatedPopulation: nullableNumber }).parse(properties)
      const source = z.object({ KELAS: nullableText, p: nullableNumber }).parse(properties)
      return { landUse: source.KELAS ?? 'Tidak diketahui', estimatedPopulation: source.KELAS === 'Pemukiman' ? source.p : null }
    }
    case 'area-longsor': {
      if (canonicalOnly || 'location' in properties) return z.object({ location: nullableText, areaM2: nullableNumber }).parse(properties)
      const source = z.object({ lokasi: nullableText, luas_m2: nullableNumber }).parse(properties)
      return { location: source.lokasi, areaM2: source.luas_m2 }
    }
    case 'area-terdampak':
    case 'persil-tanah': {
      if (canonicalOnly || 'parcelId' in properties) return z.object({ parcelId: parcelIdentity, landUse: z.string() }).parse(properties)
      const source = z.object({ NIB: parcelIdentity, PENGGUNAAN: nullableText }).parse(properties)
      return { parcelId: source.NIB, landUse: source.PENGGUNAAN ?? 'Tidak diketahui' }
    }
  }
}

function readGeometry(bytes: Uint8Array, project: (point: [number, number]) => [number, number]): Polygon | MultiPolygon {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes[0] !== 71 || bytes[1] !== 80 || bytes[2] !== 0 || bytes[3] & 48) throw new Error('Geometri GeoPackage tidak didukung.')
  const envelope = (bytes[3] >> 1) & 7
  const envelopeSizes = [0, 32, 48, 48, 64]
  if (envelope > 4) throw new Error('Envelope GeoPackage tidak valid.')
  let offset = 8 + envelopeSizes[envelope]
  function uint(little: boolean) {
    const value = view.getUint32(offset, little)
    offset += 4
    return value
  }
  function read(): Polygon | MultiPolygon {
    const order = view.getUint8(offset++)
    if (order !== 0 && order !== 1) throw new Error('Urutan byte geometri tidak valid.')
    const little = order === 1
    const type = uint(little)
    const count = uint(little)
    if (count > 1000000) throw new Error('Geometri terlalu besar.')
    if (type === 3) {
      const coordinates: number[][][] = []
      for (let r = 0; r < count; r++) {
        const points = uint(little)
        if (points > 1000000) throw new Error('Geometri terlalu besar.')
        const values: number[][] = []
        for (let p = 0; p < points; p++) {
          const x = view.getFloat64(offset, little)
          const y = view.getFloat64(offset + 8, little)
          offset += 16
          values.push(project([x, y]))
        }
        coordinates.push(values)
      }
      return { type: 'Polygon', coordinates }
    }
    if (type === 6) {
      const coordinates: number[][][][] = []
      for (let p = 0; p < count; p++) {
        const child = read()
        if (child.type !== 'Polygon') throw new Error('MultiPolygon tidak valid.')
        coordinates.push(child.coordinates)
      }
      return { type: 'MultiPolygon', coordinates }
    }
    throw new Error('Hanya Polygon dan MultiPolygon dua dimensi yang didukung.')
  }
  return read()
}

export async function convertGisBytes(bytes: ArrayBuffer, filename: string, inputCode: string, wasmUrl: string): Promise<GisFeatureCollection> {
  const code = gisCodeSchema.parse(inputCode)
  const extension = filename.split('.').pop()?.toLowerCase()
  let data: unknown
  if (extension === 'gpkg') {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl })
    const db = new SQL.Database(new Uint8Array(bytes))
    try {
      const layers = db.exec('SELECT table_name, column_name, srs_id, z, m FROM gpkg_geometry_columns')[0]?.values
      if (!layers || layers.length !== 1) throw new Error('GeoPackage harus memiliki satu layer poligon.')
      const [table, column, srs, zDimension, mDimension] = layers[0]
      if (typeof table !== 'string' || typeof column !== 'string' || zDimension !== 0 || mDimension !== 0) throw new Error('Layer harus berupa poligon dua dimensi.')
      const definition = db.exec('SELECT definition FROM gpkg_spatial_ref_sys WHERE srs_id = ' + Number(srs))[0]?.values[0]?.[0]
      if (typeof definition !== 'string' || ![4326, 32749, 23835].includes(Number(srs))) throw new Error('Sistem koordinat sumber belum didukung.')
      const projection = proj4(definition, 'EPSG:4326')
      const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"'
      const statement = db.prepare('SELECT * FROM ' + quote(table))
      const features: Feature<Polygon | MultiPolygon>[] = []
      try {
        while (statement.step()) {
          const row = statement.getAsObject()
          const blob = row[column]
          if (!(blob instanceof Uint8Array)) throw new Error('Geometri kosong tidak didukung.')
          features.push({
            type: 'Feature',
            id: typeof row.fid === 'number' ? row.fid : features.length,
            properties: canonicalProperties(code, row),
            geometry: readGeometry(blob, (point) => projection.forward(point)),
          })
        }
      } finally {
        statement.free()
      }
      data = { type: 'FeatureCollection', features }
    } finally {
      db.close()
    }
  } else if (extension === 'zip') {
    const result = await shp(bytes)
    if (Array.isArray(result)) throw new Error('ZIP harus berisi satu shapefile beserta berkas pendampingnya.')
    data = result
  } else if (extension === 'geojson' || extension === 'json') {
    data = JSON.parse(new TextDecoder().decode(bytes))
  } else {
    throw new Error('Gunakan GeoPackage, ZIP shapefile, atau GeoJSON.')
  }
  const parsed = collection.parse(data)
  return gisDatasetUpdateSchema(code).parse({
    filename,
    data: {
      type: 'FeatureCollection',
      features: parsed.features.map((feature) => ({ ...feature, properties: canonicalProperties(code, feature.properties ?? {}, extension === 'geojson' || extension === 'json') })),
    },
  }).data
}
