# Plan 106: Bind create forms with runtime context

## Decision and status

The user accepted this design direction on 2026-10-26. Implementation and parent review are complete on
`feat/resource-authoring-simplification`. See the shared
[verification record](108-unify-resource-configuration-contracts.md#verification). This file keeps the design and its original rationale.

Keep the reusable form definition in the resource. Supply the actual context
when the caller binds a create form. Make every resource create binding callable.
Use `users.create()` for a form without context. Use
`observations.create({ context })` for a form that requires context.

Static form declarations remain unchanged. They need no empty context object,
field callback, application factory, or additional generic argument. Existing
`load`, `initialData`, and input loaders retain their separate responsibilities.

[Plan 107](107-resolve-form-field-configuration.md) extends this decision with
complete configuration functions at individual field entries. Its accepted
shape replaces the earlier whole-`fields` context callback in this plan.

The [architecture guide](../docs/resource_system_overhaul/ARCHITECTURE.md)
describes the implementation in this branch. Examples below record the
accepted target.

## Problem

The [create declaration](../packages/loom/src/resources/operations.ts) accepts a
static form bag. The [resource binder](../packages/loom/src/resources/bindResource.ts)
builds the create page bag when it binds the resource. Update already has a
factory that receives record identity and optional record context.

Form already supports runtime context, asynchronous draft loading, initial
values, and reactive field behavior. The missing capability is an explicit
create binding that supplies context before the effective editor configuration
is assembled.

The motivating consumer is QHSSE Observations in the user's `hk-shield-ads`
repository, under `produksi/website/src/features/qhsse-observations/`.
Its resource defines create fields and a draft using the default category
`mwt`. `QhsseObservationForm.vue` extracts that bound form, replaces the create
fields with the actual category and project context, and replaces its loader.
An author must inspect both files to determine the effective editor.

The target removes that placeholder configuration and the later replacements.
The resource owns the definition. The caller supplies declared instance inputs.

## Authoring contract

### Forms without context

Keep the existing static form declaration:

```ts
form: defineForm({
	schema: userCreateSchema,
	fields: {
		name: { renderer: 'text' },
		email: { renderer: 'text' },
	},
	submit: createUser,
})
```

Change the consuming page from `users.create` to `users.create()`:

```vue
<FormView v-bind="users.create()" />
```

Do not retain both an object binding and a callable binding. Migrate the
consumers in the same implementation change.

### Forms with context

Keep an ordered field map in `defineForm`. Each entry can be a static object
or a typed function that resolves that field with runtime context and the
current draft. An application-level function that wraps the entire form is
optional.

The following example abbreviates the existing schema, access rules, and field
construction. The context type is an application type.

```ts
type ObservationCreateContext = {
	categoryCode: QhsseObservationType
	projectId?: number
}

type ObservationFieldContext = {
	draft: FormDraftSnapshot<ObservationFormInput>
	context: ObservationCreateContext
}

export const observations = defineResource({
	...resourceOptions,
	create: {
		...createPolicy,
		form: defineForm({
			schema: observationSchema,
			fields: {
				project_id: ({ draft, context }: ObservationFieldContext) => ({
					renderer: 'select',
					props: {
						...projectProps,
						disabled: context.projectId !== undefined,
						searchParameters: { division_id: draft.division_id },
					},
					span: 6,
				}),
			},
			submit: createObservation,
		}),
	},
})
```

The caller supplies the actual business context and any known initial values:

```ts
const create = observations.create({
	context: {
		categoryCode,
		projectId,
	},
	initialData: {
		category_code: categoryCode,
		project_id: projectId,
	},
})
```

```vue
<FormView v-bind="create" />
```

Infer the required context from the definition. Reject a missing or incompatible
context at the binding call. Preserve schema input, field-key, renderer-prop,
parsed-output, and submit-result inference. Static definitions require no
context annotation.

The mounted Form owns reactive field resolution. The resource binder passes
the binding inputs and adds operation policy. It does not create a draft,
execute draft-dependent field functions, inspect schema fields, select
renderers, or interpret asset values. Plan 107 defines the configuration shape.

## Ownership

| Concern | Owner |
|---|---|
| Schema, selected fields, labels, validators, and context-dependent field configuration | The form definition |
| Actual category, project, or other context for this editor | The caller |
| Initial draft values or the function that prepares them | The application, supplied through `initialData` or `load` |
| Draft, validation, pending work, reset, and local post-write state | The mounted Form session |
| Dropdown choices, option queries, and selected-value hydration | The input component and its configured source |
| Resource identity, access checks, cache ownership, invalidation, and managed operation outcomes | The resource operation |
| Page presentation, navigation, and dialog lifecycle | The route and page wrapper |

Context configures the editor. It is not the draft and does not replace the
form schema. For example, project context can disable project selection, while
`initialData.project_id` supplies the selected value. Keep schema input, the
incomplete draft, parsed submit output, and the returned result distinct.

Input components continue to fetch their own option data. A form-level loader
prepares a draft. In the motivating create flow, that loader checks category
access, fetches a supplied project's division when needed, and returns initial
values. For edit, loading an existing observation also supplies its saved
values and version. A parent can prepare those values instead.

## Required behavior

Binding supplies declared inputs when it assembles the guarded form bag.
The mounted Form resolves dynamic fields against its current draft and context.
The caller must not need to extract `.create.form` and replace fields, resource
metadata, or submit behavior to provide context.

The binding returns complete FormView props, including the nested Form bag.
Extracting that Form bag for Form or DialogForm preserves the same operation
behavior. The binding options do not replace the guarded submit callback.

Keep constructors free of mounted sessions, app injection, network requests,
and executed defaults. Each mounted editor owns its draft. Shared definitions
must not hold mutable session state.

Keep access checks at operation execution. Preserve returned-identity checks,
write invalidation, uncertain post-write blocks, confirmed refresh recovery,
and cancellation behavior. Do not parse schema output again in a wrapper.

Separate three context changes:

- Data that arrives asynchronously uses the existing loader and draft rules.
- Presentation changes within the same editing task preserve the draft and
  use the existing reactive behavior where applicable.
- A business-target change creates a new binding after the caller resolves
  unsaved edits. An old request or callback must not update the new editor.

Do not rebuild the binding on each render. Do not reset a session merely
because an equivalent context object has a new reference.

## Contract details to resolve before implementation

The direction above is accepted. Resolve these details within that direction:

1. Define the context type inference across `defineForm`, direct Form props,
   resource create bindings, and wrappers. Keep direct and managed forms
   consistent without requiring context from static definitions.
2. Use Plan 107's per-field functions for reactive configuration. Define which
   compatible context updates preserve the session. Keep business-target changes
   explicit. Do not introduce a second whole-map resolver.
3. Define stable binding and cache identities. Contextual loaders for different
   categories or projects must not share the wrong draft. Do not use an
   arbitrary context object or its reference as the implicit cache identity.
4. Define the permitted `load` and `initialData` binding inputs and retain their
   current precedence, cancellation, refresh, and controlled-model behavior.
   Keep resource ownership and guarded submit outside these overrides.

## Implementation sequence

1. Finalize the binding signatures and lifecycle details above. Inventory
   create declarations, page consumers, extracted Form bags, diagnostics,
   examples, and guidance in Carta. Use the current users module as the static
   example and QHSSE Observations as the contextual design case.
2. Implement callable create binding and typed contextual form configuration
   in Loom. Migrate Carta consumers in the same change. Keep static field maps
   and their inference. Add no compatibility wrapper or application-factory
   requirement.
3. Update the architecture guide, form guide, compiled examples, and authoring
   guidance to describe the implemented contract. Remove obsolete static
   create-bag guidance at that point.
4. Select focused proof for the changed contracts and lifecycle. Use
   `test-audit` before changing tests. Use `verify-carta-module` for application
   module proof. Prefer existing compiled and mounted fixtures.

Implementation acceptance requires these observable results:

- A static create form keeps its declaration and works through `create()`.
- A contextual create form receives correctly typed context without a required
  application wrapper or placeholder values.
- Two bindings of one definition keep their drafts and loading scopes separate.
- A compatible presentation update preserves edits. A changed business target
  cannot receive stale work from the previous binding.
- Inputs retain independent option loading. Form retains existing draft
  loading, validation, reset, and controlled-model behavior.
- Create and extracted Form usage retain access, identity, invalidation, and
  post-write recovery behavior.
- The contextual example needs no later replacement of fields or resource
  metadata. Migrated source and guidance contain no old object-style create
  consumption.

Run the Loom type check, web type check, contract diagnostics, architecture
gate, and focused behavior checks for the changed owners. Record the commands
and results when implementation occurs.

## Scope and alternatives

This plan covers Form configuration and resource create binding.
[Plan 108](108-unify-resource-configuration-contracts.md) records the accepted
cross-surface conventions. Broader resource reuse and a redesign of update
operation behavior remain later discussion topics. Preserve update behavior
during the create migration.

The user later authorized Carta implementation and Git publication. An HK Shield
migration and package publication remain outside this work.

The accepted direction replaces the earlier broader proposal to expose managed
CRUD operations independently of form definitions. That separation is not
required for this problem. A mandatory application factory would add another
authoring step. A new loading system would duplicate existing capabilities.

Laziness Protocol keeps the static path and existing draft APIs. Minimize Reader
Load gives the definition and its instance inputs separate owners. Type System
Discipline preserves typed context, draft, parsed output, and result boundaries.
