import { z } from "zod/v4";
import { createSelectSchema } from "drizzle-orm/zod";
import { gisData } from "./gis-data.table";
export const vulnerabilityClasses = ["RENDAH", "SEDANG", "TINGGI"] as const;
export const vulnerabilityDatasets = [
  { code: "kerentanan-fisik", name: "Kerentanan Fisik", shapefile: "KERENTANAN_FISIK", classField: "KELAS" },
  { code: "fasilitas-kesehatan", name: "Fasilitas Kesehatan", shapefile: "FASKES", classField: "KELAS", nameField: "Keterangan" },
  { code: "fasilitas-umum", name: "Fasilitas Umum", shapefile: "FASUM", classField: "KELAS", nameField: "NAMA" },
  { code: "fasilitas-pendidikan", name: "Fasilitas Pendidikan", shapefile: "PENDIDIKAN", classField: "KELAS", nameField: "PENDIDIKAN" },
  { code: "rumah", name: "Rumah", shapefile: "RUMAH", classField: "KELAS" },
  { code: "kerentanan-lingkungan", name: "Kerentanan Lingkungan", shapefile: "RENTAN_LINGKUNGAN", classField: "SKOR" },
  { code: "kelas-hutan", name: "Kelas Hutan", shapefile: "HUTAN_KELAS", classField: "SKOR" },
  { code: "kelas-semak", name: "Kelas Semak", shapefile: "SEMAK_KELAS", classField: "SKOR" },
] as const;
export const evacuationSupportingDatasets = [
  { code: "rambu-jalur-evakuasi", name: "Rambu Jalur Evakuasi", table: "rambu_jalur evakuasi", geometry: "point", nameField: "arah rambu" },
  { code: "rambu-peringatan", name: "Rambu Peringatan", table: "rambu_peringatan", geometry: "point", nameField: "keterangan" },
  { code: "titik-longsor", name: "Titik Longsor", table: "tiitk longsor", geometry: "point", nameField: "keterangan" },
  { code: "jaringan-jalan", name: "Jaringan Jalan", table: "jalan_net_v3", geometry: "line" },
  { code: "masjid", name: "Masjid", table: "masjid", geometry: "point" },
  { code: "batas-administrasi", name: "Batas Administrasi", table: "batas administrasi_ar", geometry: "polygon", nameField: "WADMKD" },
] as const;

export const gisDatasets = [
  { code: "bahaya", name: "Bahaya", layers: ["bahaya"] },
  { code: "keterpaparan", name: "Keterpaparan", layers: ["penggunaan-lahan", "estimasi-penduduk"] },
  { code: "area-longsor", name: "Area Longsor", layers: ["area-longsor"] },
  { code: "area-terdampak", name: "Area Terdampak", layers: ["area-terdampak"] },
  { code: "persil-tanah", name: "Persil Tanah", layers: ["persil-tanah"] },
  { code: "jalur-evakuasi", name: "Jalur Evakuasi", layers: ["jalur-evakuasi"] },
  ...[...vulnerabilityDatasets, ...evacuationSupportingDatasets].map(({ code, name }) => ({ code, name, layers: [code] as const })),
] as const;
export const evacuationKinds = ["longsor-tes", "tes-tea", "tes", "tea"] as const;
const evacuationProperties = z.object({
  kind: z.enum(evacuationKinds),
  name: z.string().trim().min(1).nullable(),
});
const namedProperties = z.object({ name: z.string().trim().min(1).nullable() });
const vulnerabilityProperties = namedProperties.extend({
  vulnerabilityClass: z.enum(vulnerabilityClasses).nullable(),
});
const geometryTypes = {
  point: ["Point"],
  line: ["LineString", "MultiLineString"],
  polygon: ["Polygon", "MultiPolygon"],
} satisfies Record<string, string[]>;
export type GisDatasetCode = (typeof gisDatasets)[number]["code"];
export const gisDatasetCodes = gisDatasets.map((dataset) => dataset.code);

export const gisCodeSchema = z.enum(gisDatasetCodes);
const position = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
]);
const ring = z
  .array(position)
  .min(4)
  .refine(
    (points) =>
      points[0][0] === points[points.length - 1][0] &&
      points[0][1] === points[points.length - 1][1],
    "Polygon rings must be closed.",
  );
const polygon = z.array(ring).min(1);
const line = z.array(position).min(2);
export const gisGeometrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Polygon"), coordinates: polygon }),
  z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(polygon).min(1) }),
  z.object({ type: z.literal("Point"), coordinates: position }),
  z.object({ type: z.literal("LineString"), coordinates: line }),
  z.object({ type: z.literal("MultiLineString"), coordinates: z.array(line).min(1) }),
]);
export const gisFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z
    .array(
      z.object({
        type: z.literal("Feature"),
        id: z.union([z.string(), z.number()]).optional(),
        geometry: gisGeometrySchema,
        properties: z.record(
          z.string(),
          z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
        ),
      }),
    )
    .min(1)
    .max(100000),
});
export const gisUpdateSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  data: gisFeatureCollectionSchema,
});
export const gisCompressedUpdateSchema = gisUpdateSchema.pick({ filename: true }).extend({ gzipBase64: z.string().min(1) });
export const gisUploadSchema = z.union([gisUpdateSchema, gisCompressedUpdateSchema]);
export const gisMaxUploadBytes = 25 * 1024 * 1024;
export const gisStoredRecordSchema = createSelectSchema(gisData);
export const gisDataSelectSchema = gisStoredRecordSchema
  .omit({ assetKey: true })
  .extend({ name: z.string(), layers: z.array(z.string()), available: z.boolean() });
export type GisFeatureCollection = z.infer<typeof gisFeatureCollectionSchema>;

export function gisDatasetUpdateSchema(code: GisDatasetCode) {
  const vulnerability = vulnerabilityDatasets.find((entry) => entry.code === code);
  const supporting = evacuationSupportingDatasets.find((entry) => entry.code === code);
  const expectedTypes = geometryTypes[supporting?.geometry ?? "polygon"];
  return gisUpdateSchema.superRefine((input, context) => {
    const evacuationKindsPresent = new Set<string>();
    input.data.features.forEach((feature, index) => {
      const properties = feature.properties;
      const type = feature.geometry.type;
      if (code === "jalur-evakuasi") {
        const parsed = evacuationProperties.safeParse(properties);
        const isPoint = parsed.success && (parsed.data.kind === "tes" || parsed.data.kind === "tea");
        const geometryMatches = isPoint ? type === "Point" : type === "LineString" || type === "MultiLineString";
        if (!parsed.success || !geometryMatches) {
          context.addIssue({
            code: "custom",
            path: ["data", "features", index],
            message: "Geometri atau jenis fitur evakuasi tidak sesuai.",
          });
          return;
        }
        feature.properties = parsed.data;
        evacuationKindsPresent.add(parsed.data.kind);
        return;
      }
      if (!expectedTypes.includes(type)) {
        context.addIssue({
          code: "custom",
          path: ["data", "features", index, "geometry"],
          message: "Tipe geometri tidak sesuai dengan dataset.",
        });
      }
      const propertySchema =
        vulnerability
          ? vulnerabilityProperties
          : supporting
            ? namedProperties
            : code === "bahaya"
          ? z.object({ hazardClass: z.enum(["RENDAH", "SEDANG", "TINGGI"]) })
          : code === "keterpaparan"
            ? z
                .object({
                  landUse: z.string().min(1),
                  estimatedPopulation: z.number().finite().nonnegative().nullable(),
                })
                .refine(
                  (value) => value.landUse !== "Pemukiman" || value.estimatedPopulation !== null,
                  "Settlement population is required.",
                )
            : code === "area-longsor"
              ? z.object({
                  location: z.string().nullable(),
                  areaM2: z.number().finite().nonnegative().nullable(),
                })
              : z.object({
                  parcelId: z.union([z.string(), z.number().finite()]).nullable(),
                  landUse: z.string().nullable(),
                });
      const parsed = propertySchema.safeParse(properties);
      if (!parsed.success)
        context.addIssue({
          code: "custom",
          path: ["data", "features", index, "properties"],
          message: "Dataset properties do not match the selected GIS dataset.",
        });
      else feature.properties = parsed.data;
    });
    if (code === "jalur-evakuasi" && evacuationKindsPresent.size !== evacuationKinds.length) {
      context.addIssue({
        code: "custom",
        path: ["data", "features"],
        message: "Data evakuasi harus memuat kedua tahap rute serta titik TES dan TEA.",
      });
    }
  });
}
