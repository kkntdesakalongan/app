import { createEntity } from "@southneuhof/sprindle/entity";
import { defineDomainPart } from "@southneuhof/sprindle/model";
import { z } from "zod/v4";
import { gisData } from "./gis-data.table";
import { gisStoredRecordSchema } from "./schema";
export const entity = createEntity({
  table: gisData,
  schemas: { create: z.object({}), update: z.object({}), select: gisStoredRecordSchema },
});
export const domain = defineDomainPart({ tables: { gisData }, entities: [entity] });
