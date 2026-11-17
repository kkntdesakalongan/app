import { defineRoute, notFound } from "@southneuhof/sprindle";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { requirePermission } from "../../../../../identity";
import { gisRecord } from "../../../../../gis/records";
import { gisData } from "../../gis-data.table";
import { gisCodeSchema } from "../../schema";
export const GET = defineRoute({
  authorize: requirePermission("view-gis-data"),
  action: async ({ c }) => {
    const code = gisCodeSchema.parse(c.req.param("id"));
    const [row] = await getDb().select().from(gisData).where(eq(gisData.code, code));
    if (!row) throw notFound();
    return c.json(gisRecord(row));
  },
});
