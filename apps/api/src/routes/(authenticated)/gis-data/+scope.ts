import { defineScope } from "@southneuhof/sprindle";
import { entity } from "./gis-data.domain";
import { gisDataSelectSchema, gisStoredRecordSchema } from "./schema";
import { gisRecord } from "../../../gis/records";
export default defineScope({
  entity,
  enrich: {
    schema: gisDataSelectSchema,
    run: (record: unknown) => gisRecord(gisStoredRecordSchema.parse(record)),
  },
});
