# @southneuhof/utilities

## 0.1.1

### Patch Changes

- Release local package updates.

## 0.1.0

### Minor Changes

- 92ab493: Extract framework utility modules into the new `@southneuhof/utilities` package.

  ### Breaking changes

  - Remove `@southneuhof/is-vue-framework/utils/*` exports.
  - Migrate all utility imports to `@southneuhof/utilities/*`.

  ### Added

  - New publishable package `@southneuhof/utilities` with utility modules and tests moved from `@southneuhof/is-vue-framework`.
  - Monorepo release and sync tooling now includes `@southneuhof/utilities` and repository sync to `https://github.com/southneuhof/utilities`.

## 0.0.1

- Initial release extracted from `@southneuhof/is-vue-framework` utilities.
