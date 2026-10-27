# Plan 107: Resolve complete form field configuration

## Decision and status

The user accepted this authoring shape on 2026-10-26. Implementation has not
started. Performance analysis and optimization are deferred.

A form field is a plain configuration object or a pure function that returns
its complete configuration. Static fields keep their current object syntax.
Dynamic fields resolve their renderer, component props, and layout together.

The function result is the field configuration, not a patch over another
configuration. The author explicitly composes shared props and field fragments.
Each resolved `span` is a number. A fixed `span: 6` needs no function.

The user also accepted `visible` as a Form-owned field property beside `span`.
It is a boolean in the resolved configuration. Omission means visible. A
dynamic field function computes the boolean directly.

This extends the accepted runtime-context direction in
[Plan 106](106-bind-create-forms-with-runtime-context.md). Keep one ordered
`fields` map with optional functions at individual entries. Replace Plan 106's
earlier whole-map context callback with this field-level resolution shape.

[Plan 108](108-unify-resource-configuration-contracts.md) records the later
accepted cross-surface direction and framework type ownership. Components
implement those shared contracts rather than restating field and prop types.

The [architecture guide](../docs/resource_system_overhaul/ARCHITECTURE.md)
continues to describe shipped behavior until implementation. The target examples
below are not implemented APIs.

## Problem

Current fields can combine static `props`, `behavior.props`, and
`behavior.presentation.props`. The
[behavior runtime](../packages/loom/src/forms/behavior.ts) merges those sources
and gives `presentation.props: null` special reset behavior.

`behavior.disabled` and component `props.disabled` can both disable the same
field. [Form](../packages/loom/src/components/core/Form.vue) combines them with
the form-wide disabled state. Moving data-source props such as
`searchParameters` into `presentation` would make that grouping less clear.

Resolve one field configuration instead. Component options belong in `props`.
Form layout belongs beside `props`. Form retains its own managed state.

## Accepted authoring shape

### Static fields

Keep ordinary declarations unchanged:

```ts
name: {
	renderer: 'text',
	span: 6,
	props: {
		maxlength: 160,
	},
}
```

### Dynamic fields

The following example abbreviates the existing Observations project field.
`projectProps` contains its loader, namespace, and option settings.

Current declaration:

```ts
project_id: {
	renderer: 'select',
	props: projectProps,
	span: 6,
	behavior: {
		disabled: () => context.projectContextId() !== undefined,
		props: ({ draft }) => ({
			searchParameters: { division_id: draft.division_id },
		}),
		presentation: () => ({ span: span(6) }),
	},
}
```

Accepted target:

```ts
project_id: ({ draft }) => ({
	renderer: 'select',
	props: {
		...projectProps,
		disabled: context.projectContextId() !== undefined,
		searchParameters: { division_id: draft.division_id },
	},
	span: span(6),
})
```

Here `span(6)` is an application helper that calculates a responsive number.
Use `span: 6` directly when the span is fixed. The field function does not make
every returned property dynamic.

Even if only `disabled` changes, the function returns the renderer, complete
authored props, and layout. Omitting `projectProps` omits its loader and option
settings. Form does not restore those values from a hidden base definition.

### Dynamic renderer selection

Return each renderer with its corresponding props:

```ts
description: ({ draft }) =>
	draft.category === 'long_text'
		? {
				renderer: 'textarea',
				props: { rows: 6 },
			}
		: {
				renderer: 'text',
				props: { maxlength: 120 },
			},
```

The example assumes a string-valued description. Every renderer branch must
accept the field's editable value and satisfy its selected component's props.
Changing the renderer does not itself replace the draft value.

### Field visibility

Keep visibility at field level:

```ts
project_id: ({ draft }) => ({
	renderer: 'select',
	visible: draft.division_id != null,
	span: 6,
	props: projectProps,
})
```

Static fields can declare `visible: false`. Do not put visibility in component
props or retain a separate `behavior.visible` callback. Form owns whether the
field and its label are rendered. Preserve existing hidden-field draft,
validation, and issue behavior when visibility changes.

## Ownership and evaluation

The form definition owns the field objects and functions. A resolver receives
the current read-only draft and the form's supplied context. Static definitions
need no context annotation. Preserve useful schema and renderer inference.

The mounted Form evaluates dynamic entries reactively. `defineForm` must not
execute a draft-dependent function during module construction. Resource binding
supplies context and guarded operation behavior without interpreting fields.

Resolvers are pure. They do not write to the draft, start requests, or perform
submission. A returned `props.load` remains an input-owned loader. Merely
resolving that property does not execute it.

Re-evaluation updates compatible configuration without resetting the draft.
Keep field keys stable. Preserve existing session rules for schema changes,
business-target changes, and stale work. Fresh configuration objects alone
must not create a new editing session.

Author-controlled `disabled` belongs in component `props`. Form still applies
its form-wide disabled state and derived-field restrictions. A returned
`disabled: false` cannot override those restrictions. Model values, errors,
and schema-controlled requiredness remain managed by Form.

Form-owned layout and visibility remain outside component props. Resolve
`span` and `visible` as ordinary field properties. Preserve `behavior.derived`
for now. This decision does not remove derived writes, dynamic renderers, or
paired field bindings. Do not recreate configuration callbacks as a second
route under those capabilities.

## Contract changes and implementation sequence

1. Add the object-or-function field contract. Infer each resolved renderer and
   its props. Reject incomplete configurations and incompatible branches at the
   field declaration. Retain read-only draft and context boundaries.
2. Resolve dynamic fields in the form layer. Retain state across compatible
   configuration updates. Keep component loader identity and source-change
   semantics correct. Do not treat loader restarts as only a performance issue.
3. Migrate configuration currently expressed through `behavior.props`,
   `behavior.disabled`, `behavior.presentation`, and `behavior.visible`.
   Preserve supported labels, layout, conditional required hints, and hidden
   field behavior. Specify the resolved shape for required hints without
   changing schema validity.
4. Remove the migrated callback options, the dynamic prop merge chain, and the
   special `presentation.props: null` reset. Keep ordinary component prop values
   and explicit application spreads. Add no compatibility wrapper.
5. Reconcile Plan 106's binding types with the same per-field resolver contract.
   Do not also introduce a whole-`fields` resolver for the same configuration.
6. Update current guides and examples when implementation ships. Use
   `test-audit` before test changes and `verify-carta-module` for application
   module proof. Prefer existing contract and mounted fixtures.

Acceptance requires unchanged static declarations, correctly typed dynamic
branches, one authored component-prop path, retained drafts on compatible
updates, and preserved Form restrictions. Verify that dependent option loaders
continue to behave correctly and that context remains isolated between forms.
Verify visible-by-default fields, static hiding, and reactive visibility changes
through the shared resolved field contract.

## Deferred work and scope

The user deferred performance implications. Do not make an optimization scheme,
benchmark target, or caching framework a prerequisite for this design. Select
those only from implementation evidence. Correctness of reactivity, identity,
and draft preservation remains required.

This plan concerns Form field configuration. Plan 108 records extension of the
same authoring convention to List and Detail. Their evaluation scopes and
surface-specific contracts still need to be defined before implementation.
The current task changes documentation only. Framework implementation, HK
Shield migration, and Git publication remain outside this task.

Laziness Protocol keeps static objects and ordinary object composition.
Minimize Reader Load favors one resolved configuration. Type System Discipline
keeps renderer compatibility and the separate draft and submit contracts.
