# Carta module context

This context defines Carta terms used in API and web module guidance.

## Module terms

**Module**: One Carta application responsibility, such as users or role
permissions, and the implementation that owns it.

**Table**: A Drizzle storage definition owned by an API module. It defines
columns, constraints, defaults, indexes, and foreign keys.

**Schema**: An executable parser or converter for accepted values at one
boundary. An API module's `schema.ts` owns create, update, and select schemas
made from its table, plus operation input schemas.

**Entity**: Sprindle configuration that joins a table, its create, update, and
select schemas, and persistence behavior for API operations. Web code imports
schema values from the API module's `schema.ts`.

**Operation**: One application read or write action, such as `createSale` or
`closeSale`.

**Route**: The HTTP entry for an operation. Carta API file routes define its
method and URL.

**Scope**: The inherited request context, access policy, entity, and hooks for a
route subtree.

**Workflow**: A business process or sequence of operations. It does not name a
technical layer or file category, and it does not require a `*.workflow.ts`
file.

**Contract**: An agreement at a boundary. A schema describes its accepted
value part. A contract does not require a separate package or file.
