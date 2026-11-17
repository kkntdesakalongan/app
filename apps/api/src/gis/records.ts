import { gisDatasets } from "../routes/(authenticated)/gis-data/schema";
import type { gisData } from "../routes/(authenticated)/gis-data/gis-data.table";
export function gisRecord(row: typeof gisData.$inferSelect) {
  const definition = gisDatasets.find((dataset) => dataset.code === row.code);
  if (!definition) throw new Error("Unknown GIS dataset.");
  return {
    code: row.code,
    name: definition.name,
    layers: [...definition.layers],
    filename: row.filename,
    featureCount: row.featureCount,
    updatedAt: row.updatedAt,
    available: row.assetKey !== null,
  };
}
