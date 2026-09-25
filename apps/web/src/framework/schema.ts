import type { HonoCreateOf, HonoRecordOf, HonoResponseRecordOf, HonoUpdateOf } from './hono/contracts'

type RawSchemaSource = { readonly _input: unknown; readonly _output: object }
type SchemaOutput<TSchema> = TSchema extends { readonly _output: infer TOutput } ? TOutput : never
type SameType<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? ((<T>() => T extends TRight ? 1 : 2) extends <T>() => T extends TLeft ? 1 : 2 ? true : false) : false
type IsAny<TValue> = 0 extends 1 & TValue ? true : false
type SchemaShape<TSchema> = TSchema extends { shape: infer TShape } ? (TShape extends (...args: never[]) => infer TResult ? TResult : TShape) : never
type SchemaFieldInput<TField> = TField extends { readonly _input: infer TInput } ? TInput : never
type RequiredSchemaKeys<TSchema> =
  SchemaShape<TSchema> extends infer TShape
    ? TShape extends Record<string, { readonly _input: unknown }>
      ? { [TKey in keyof TShape]: undefined extends SchemaFieldInput<TShape[TKey]> ? never : TKey }[keyof TShape]
      : never
    : never
type RecordOutputGuard<TSchema extends RawSchemaSource, TRecord extends object> = SameType<SchemaOutput<TSchema>, TRecord> extends true ? unknown : never
type ResponseRecordOutputGuard<TSchema extends RawSchemaSource, TRecord> = IsAny<TRecord> extends true ? unknown : TRecord extends object ? RecordOutputGuard<TSchema, TRecord> : never
type WriteOutputGuard<TSchema extends RawSchemaSource, TWrite extends object> = [SchemaOutput<TSchema>] extends [TWrite]
  ? Exclude<keyof SchemaOutput<TSchema>, keyof TWrite> extends never
    ? Exclude<RequiredSchemaKeys<TSchema>, keyof TWrite> extends never
      ? unknown
      : never
    : never
  : never

export function checkedHonoRecordSchema<const TRoute, const TSchema extends RawSchemaSource>(_route: TRoute, schema: TSchema & RecordOutputGuard<TSchema, HonoRecordOf<TRoute>>): TSchema {
  return schema
}

export function checkedHonoResponseRecordSchema<const TEndpoint, const TSchema extends RawSchemaSource>(
  _endpoint: TEndpoint,
  schema: TSchema & ResponseRecordOutputGuard<TSchema, HonoResponseRecordOf<TEndpoint, 200>>
): TSchema {
  return schema
}

export function checkedHonoCreateSchema<const TRoute, const TSchema extends RawSchemaSource>(_route: TRoute, schema: TSchema & WriteOutputGuard<TSchema, HonoCreateOf<TRoute>>): TSchema {
  return schema
}

export function checkedHonoUpdateSchema<const TRoute, const TSchema extends RawSchemaSource>(_route: TRoute, schema: TSchema & WriteOutputGuard<TSchema, HonoUpdateOf<TRoute>>): TSchema {
  return schema
}
