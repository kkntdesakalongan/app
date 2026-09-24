# Form field type manifest

Read `docs/ui/forms.md` first. It owns the field implementation decision. Use
this manifest to identify the registered renderer or composite selected by that
decision.
The live renderer keys and app adapters are in:

- `packages/loom/src/renderers/form.ts`
- `apps/web/src/framework/inputs/registry.ts`

Use an input catalog if the app has one. The source files are authoritative when this manifest and the runtime differ.
Do not create a second renderer list in application code.

## Text and numeric values

| Renderer | Use it for | Value and configuration |
| --- | --- | --- |
| `text` | One-line text, email, telephone, URL, or native input type | string; `type`, `required` |
| `textarea` | Multi-line plain text | string; `required`, native textarea props |
| `password` | Secret text entry | string; `required` |
| `number` | Counts, measures, percentages, or money | number; `min`, `max`, `step`, `required`; `currency` and `locale` for money |
| `tag` | A short string list entered as tags | string array; `placeholder` |
| `color` | A color value | color string; native color props |
| `rich-text` | Formatted text that the API stores in the approved rich-text shape | string; current catalog props |

Use `number` for numeric schemas. Do not use a text field and parse it by hand.
Use `text` with a native `type` only when the form contract still owns a string.

## Choice and relation values

| Renderer | Use it for | Value and common props |
| --- | --- | --- |
| `select` | A compact closed choice set | scalar or array; `source: { load, namespace? }` or static `data`; `pick`, `view`, `multi`, `searchable`, `clearable` |
| `radio` | A small exclusive set that must stay visible | scalar; `source: { load, namespace? }` or static `data`; `pick`, `view`, `variant`, `direction` |
| `checkbox` | One boolean agreement or flag | boolean; `required` |
| `switch` | One on/off value | boolean; `required` |
| `checkbox-group` | A small visible multi-choice set | selected record array; `source: { load, namespace? }` or static `data`; `pick`, `view`, `searchParameters` |
| `lookup` | A searchable database-backed relation | scalar identity; `source: { load, namespace?, loadDetail }`; `props.table`, `pick`, `view`, `searchParameters` |

Use static `data` props only for a small closed set. For database-backed
options, pass the owner's loader, for example
`source: { load: roles.list.table.load, namespace: roles.list.table.namespace }`.
For lookup, add `loadDetail(context)` using the owner's detail loader and pass
its own table definition in `props.table`. Keep filters in `searchParameters`.
The raw form schema defines accepted multi-selection values and any transform
to operation input; the users form accepts role records and transforms them to
IDs. A switch inside a form edits the draft; it does not write immediately
unless that interaction is explicitly implemented.

## Date and time values

| Renderer | Use it for | Value and common props |
| --- | --- | --- |
| `date` | One calendar date | date string; `required`, native date props |
| `daterange` | Start and end dates selected together | two date strings; `locale`, `required` |
| `month` | One year and month | `YYYY-MM` string; `required` |
| `year` | One year | number or year string; `required` |
| `time` | One time of day | time string; native time props |

Match the form schema to the value emitted by the input. Use a schema transform
when the submitted output needs another representation.

## Assets, location, and drawing values

| Renderer | Use it for | Value and required configuration |
| --- | --- | --- |
| `file` | One or more non-image uploads | asset object or array; app upload defaults, `multi`, `accept`, `maxSize` |
| `image` | One or more image uploads with previews | image asset object or array; app upload defaults, `limit`, `multi`, `maxSize` |
| `location` | One address and coordinate value | coordinate object; app `operations` |
| `multi-location` | Several address and coordinate values | coordinate object array; app `operations` |
| `icon-select` | One icon name from the current icon catalog | icon name string; current icon options |
| `canvas` | A drawing or signature saved as an image value | saved image string; `width`, `height`, `onSave` |

For file/image values, read the shared
[asset contract](../../carta-module-development/references/frontend-field-contract.md#asset-fields),
including current framework limits.
Location inputs use the app location operations. Use the form schema when the
submitted API shape differs from the control shape.

## Structured and layout values

| Renderer | Use it for | Value and required configuration |
| --- | --- | --- |
| `table` | An array of form-owned rows | row object array; `fields`, `form`, `table`, optional `rowKey` and reorder props |
| `separator` | A labelled section break in a form | no submitted value; label and layout props |

Use `TableInput` with separate `defineTable` and `defineForm` row definitions
before you build manual repeatable rows. Supply `toDraft` when table rows and
form input differ. A row lookup `view` covers the selection dialog only. Define
the row cell through [display and form pattern](../../web-ui-surfaces/references/fields.md).
Use a separate child resource when rows need their own permissions, paging, or
actions.
