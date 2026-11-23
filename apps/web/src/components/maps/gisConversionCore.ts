import initSqlJs from 'sql.js'
import proj4 from 'proj4'
import shp from 'shpjs'
import { z } from 'zod/v4'
import { evacuationKinds, gisCodeSchema, gisDatasetUpdateSchema, gisGeometrySchema, type GisFeatureCollection } from '@southneuhof/api/src/routes/(authenticated)/gis-data/schema.ts'

export type { GisFeatureCollection } from '@southneuhof/api/src/routes/(authenticated)/gis-data/schema.ts'

const inputFeature = z.object({ type: z.literal('Feature'), id: z.union([z.number(), z.string()]).optional(), geometry: gisGeometrySchema, properties: z.record(z.string(), z.unknown()).nullable() })
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
    case 'jalur-evakuasi':
      throw new Error('Fitur evakuasi memerlukan jenis rute atau titik.')
    case 'area-terdampak':
    case 'persil-tanah': {
      if (canonicalOnly || 'parcelId' in properties) return z.object({ parcelId: parcelIdentity, landUse: z.string() }).parse(properties)
      const source = z.object({ NIB: parcelIdentity, PENGGUNAAN: nullableText }).parse(properties)
      return { parcelId: source.NIB, landUse: source.PENGGUNAAN ?? 'Tidak diketahui' }
    }
  }
}

const evacuationTables = {
  'longsor-tes': 'rute_titik longsor ke tes',
  'tes-tea': 'rute_tes ke_tea',
  tes: 'titik_evakuasi_sementara',
  tea: 'master poin TEA',
} satisfies Record<(typeof evacuationKinds)[number], string>

type Geometry = z.infer<typeof gisGeometrySchema>
type Position = [number, number]

function readGeometry(bytes: Uint8Array, project: (point: Position) => Position): Geometry {
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
  function point(little: boolean): Position {
    const x = view.getFloat64(offset, little)
    const y = view.getFloat64(offset + 8, little)
    offset += 16
    return project([x, y])
  }
  function readMany<T>(little: boolean, readItem: () => T): T[] {
    const count = uint(little)
    if (count > 1000000) throw new Error('Geometri terlalu besar.')
    const items: T[] = []
    for (let i = 0; i < count; i++) items.push(readItem())
    return items
  }
  function readType(): [number, boolean] {
    const order = view.getUint8(offset++)
    if (order !== 0 && order !== 1) throw new Error('Urutan byte geometri tidak valid.')
    const little = order === 1
    const type = uint(little)
    return [type, little]
  }
  const readLine = (little: boolean) => readMany(little, () => point(little))
  const readPolygon = (little: boolean) => readMany(little, () => readLine(little))
  function readParts<T>(little: boolean, expectedType: number, readPart: (partLittle: boolean) => T): T[] {
    return readMany(little, () => {
      const [type, partLittle] = readType()
      if (type !== expectedType) throw new Error('Bagian geometri GeoPackage tidak valid.')
      return readPart(partLittle)
    })
  }
  const [type, little] = readType()
  switch (type) {
    case 1:
      return { type: 'Point', coordinates: point(little) }
    case 2:
      return { type: 'LineString', coordinates: readLine(little) }
    case 3:
      return { type: 'Polygon', coordinates: readPolygon(little) }
    case 5:
      return { type: 'MultiLineString', coordinates: readParts(little, 2, readLine) }
    case 6:
      return { type: 'MultiPolygon', coordinates: readParts(little, 3, readPolygon) }
    default:
      throw new Error('Tipe geometri GeoPackage tidak didukung.')
  }
}

export async function convertGisBytes(bytes: ArrayBuffer, filename: string, inputCode: string, wasmUrl: string): Promise<GisFeatureCollection> {
  const code = gisCodeSchema.parse(inputCode)
  const extension = filename.split('.').pop()?.toLowerCase()
  let data: unknown
  if (extension === 'gpkg') {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl })
    const db = new SQL.Database(new Uint8Array(bytes))
    try {
      const layers = db.exec('SELECT table_name, column_name, srs_id, z, m FROM gpkg_geometry_columns')[0]?.values ?? []
      if (code !== 'jalur-evakuasi' && layers.length !== 1) throw new Error('GeoPackage harus memiliki satu layer poligon.')
      const sources = code === 'jalur-evakuasi' ? evacuationKinds.map((kind) => ({ kind, layer: layers.find(([table]) => table === evacuationTables[kind]) })) : [{ kind: null, layer: layers[0] }]
      const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"'
      const features: GisFeatureCollection['features'] = []
      for (const { kind, layer } of sources) {
        if (!layer) throw new Error(kind ? `Layer GeoPackage tidak ditemukan: ${evacuationTables[kind]}.` : 'Layer GeoPackage tidak ditemukan.')
        const [table, column, srs, zDimension, mDimension] = layer
        if (typeof table !== 'string' || typeof column !== 'string' || zDimension !== 0 || mDimension !== 0) throw new Error('Layer harus memiliki geometri dua dimensi.')
        const definition = db.exec('SELECT definition FROM gpkg_spatial_ref_sys WHERE srs_id = ' + Number(srs))[0]?.values[0]?.[0]
        if (typeof definition !== 'string' || ![4326, 32749, 23835].includes(Number(srs))) throw new Error('Sistem koordinat sumber belum didukung.')
        const projection = proj4(definition, 'EPSG:4326')
        const statement = db.prepare('SELECT * FROM ' + quote(table))
        try {
          while (statement.step()) {
            const row = statement.getAsObject()
            const blob = row[column]
            if (!(blob instanceof Uint8Array)) throw new Error('Geometri kosong tidak didukung.')
            const id = typeof row.fid === 'number' ? row.fid : features.length
            const name = typeof row.nama === 'string' ? row.nama.trim() || null : null
            features.push({
              type: 'Feature',
              id: kind ? `${kind}-${id}` : id,
              properties: kind ? { kind, name } : canonicalProperties(code, row),
              geometry: readGeometry(blob, (point) => projection.forward(point)),
            })
          }
        } finally {
          statement.free()
        }
      }
      data = { type: 'FeatureCollection', features }
    } finally {
      db.close()
    }
  } else if (extension === 'zip' && code !== 'jalur-evakuasi') {
    const result = await shp(bytes)
    if (Array.isArray(result)) throw new Error('ZIP harus berisi satu shapefile beserta berkas pendampingnya.')
    data = result
  } else if (extension === 'geojson' || extension === 'json') {
    data = JSON.parse(new TextDecoder().decode(bytes))
  } else {
    throw new Error(code === 'jalur-evakuasi' ? 'Gunakan GeoPackage Jalur Evakuasi atau GeoJSON.' : 'Gunakan GeoPackage, ZIP shapefile, atau GeoJSON.')
  }
  if (code === 'jalur-evakuasi') return gisDatasetUpdateSchema(code).parse({ filename, data }).data
  const parsed = collection.parse(data)
  return gisDatasetUpdateSchema(code).parse({
    filename,
    data: {
      type: 'FeatureCollection',
      features: parsed.features.map((feature) => ({ ...feature, properties: canonicalProperties(code, feature.properties ?? {}, extension === 'geojson' || extension === 'json') })),
    },
  }).data
}
