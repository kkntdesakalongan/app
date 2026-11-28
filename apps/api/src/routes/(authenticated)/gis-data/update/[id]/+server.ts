import { readJsonBody } from "../../../../../request-body";
import { randomUUID } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { defineRoute, notFound, validationError } from "@southneuhof/sprindle";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { requirePermission } from "../../../../../identity";
import { putObject, deleteObject } from "../../../../../storage/s3";
import { gisRecord } from "../../../../../gis/records";
import { gisData } from "../../gis-data.table";
import { gisCodeSchema, gisCompressedUpdateSchema, gisDatasetUpdateSchema, gisMaxUploadBytes, gisUploadSchema } from "../../schema";

function readCompressedGis(body: Record<string, unknown>) {
  const { filename, gzipBase64 } = gisCompressedUpdateSchema.parse(body);
  try {
    const decoded = gunzipSync(Buffer.from(atob(gzipBase64), "latin1"), { maxOutputLength: gisMaxUploadBytes });
    const data: unknown = JSON.parse(decoded.toString("utf8"));
    return { filename, data };
  } catch {
    throw validationError("Berkas GIS terkompresi tidak valid atau melebihi 25 MiB.");
  }
}
export const PATCH = defineRoute({
  openapi: { requestBody: gisUploadSchema },
  authorize: requirePermission("update-gis-data"),
  action: async ({ c }) => {
    const code = gisCodeSchema.parse(c.req.param("id"));
    const body = await readJsonBody(c);
    const input = gisDatasetUpdateSchema(code).parse("gzipBase64" in body ? readCompressedGis(body) : body);
    const [current] = await getDb().select().from(gisData).where(eq(gisData.code, code));
    if (!current) throw notFound();
    const key = `gis/${code}/${randomUUID()}.geojson`;
    await putObject(
      key,
      new TextEncoder().encode(JSON.stringify(input.data)),
      "application/geo+json",
    );
    let saved: typeof gisData.$inferSelect | undefined;
    try {
      [saved] = await getDb()
        .update(gisData)
        .set({
          assetKey: key,
          filename: input.filename,
          featureCount: input.data.features.length,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(gisData.code, code),
            current.assetKey === null
              ? isNull(gisData.assetKey)
              : eq(gisData.assetKey, current.assetKey),
          ),
        )
        .returning();
      if (!saved) throw validationError("The GIS dataset changed. Refresh before uploading again.");
    } catch (error) {
      const [active] = await getDb().select().from(gisData).where(eq(gisData.code, code));
      if (active?.assetKey === key) saved = active;
      else {
        await deleteObject(key);
        throw error;
      }
    }
    if (!saved) throw notFound();
    let cleanupWarning: string | undefined;
    if (current.assetKey?.startsWith(`gis/${code}/`)) {
      try {
        await deleteObject(current.assetKey);
      } catch {
        cleanupWarning = "Data tersimpan. Berkas versi sebelumnya belum dapat dibersihkan.";
      }
    }
    return c.json({ ...gisRecord(saved), ...(cleanupWarning ? { cleanupWarning } : {}) });
  },
});
