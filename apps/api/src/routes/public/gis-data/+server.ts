import { defineRoute } from "@southneuhof/sprindle";
import { isNotNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { gisRecord } from "../../../gis/records";
import { gisData } from "../../(authenticated)/gis-data/gis-data.table";
export const GET = defineRoute({
  action: async ({ c }) => {
    const rows = await getDb()
      .select()
      .from(gisData)
      .where(isNotNull(gisData.assetKey))
      .orderBy(gisData.code);
    return c.json({
      data: rows.map((row) => ({
        ...gisRecord(row),
        url: new URL(`/api/public/gis-data/${row.code}`, c.req.url).toString(),
      })),
    });
  },
});
