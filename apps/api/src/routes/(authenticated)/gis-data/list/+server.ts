import { list } from "@southneuhof/sprindle";
import { getDb } from "../../../../db";
import { requirePermission } from "../../../../identity";
import { gisData } from "../gis-data.table";
export const GET = list({
  authorize: requirePermission("view-gis-data"),
  run: async () => {
    const rows = await getDb().select().from(gisData).orderBy(gisData.code);
    return { data: rows, total: rows.length };
  },
});
