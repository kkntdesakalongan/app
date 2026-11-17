import { readJsonBody } from "../../../../../request-body";
import { randomUUID } from "node:crypto";
import { defineRoute, notFound, validationError } from "@southneuhof/sprindle";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { requirePermission } from "../../../../../identity";
import { putObject, deleteObject } from "../../../../../storage/s3";
import { gisRecord } from "../../../../../gis/records";
import { gisData } from "../../gis-data.table";
import { gisCodeSchema, gisDatasetUpdateSchema, gisUpdateSchema } from "../../schema";
export const PATCH = defineRoute({
  openapi: { requestBody: gisUpdateSchema },
  authorize: requirePermission("update-gis-data"),
  action: async ({ c }) => {
    const code = gisCodeSchema.parse(c.req.param("id"));
    const input = gisDatasetUpdateSchema(code).parse(await readJsonBody(c));
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
