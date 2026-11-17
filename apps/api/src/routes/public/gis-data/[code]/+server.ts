import { defineRoute, notFound } from "@southneuhof/sprindle";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { getObjectBytes } from "../../../../storage/s3";
import { gisData } from "../../../(authenticated)/gis-data/gis-data.table";
import { gisCodeSchema } from "../../../(authenticated)/gis-data/schema";
export const GET = defineRoute({
  action: async ({ c }) => {
    const code = gisCodeSchema.parse(c.req.param("code"));
    const [row] = await getDb().select().from(gisData).where(eq(gisData.code, code));
    if (!row?.assetKey) throw notFound();
    const bytes = await getObjectBytes(row.assetKey);
    c.header("Content-Type", "application/geo+json");
    c.header("Cache-Control", "no-cache");
    return c.body(new Uint8Array(bytes).buffer);
  },
});
