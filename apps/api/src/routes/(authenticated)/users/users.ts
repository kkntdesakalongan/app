import { defineDomainPart } from "@southneuhof/sprindle/model";
import { user } from "./users.entity";
import { users } from "./users.table";

export const domain = defineDomainPart({
  tables: { users },
  entities: [user],
});

export default { domain };
