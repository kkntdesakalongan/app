import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
export const gisData = pgTable("gis_data", {
  code: text("code").primaryKey(),
  assetKey: text("asset_key"),
  filename: text("filename"),
  featureCount: integer("feature_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});
