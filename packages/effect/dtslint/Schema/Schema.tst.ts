import type {
  Arbitrary,
  BigDecimal,
  Cause,
  Chunk,
  Config,
  Duration,
  Either,
  Equivalence,
  Exit,
  HashMap,
  HashSet,
  List,
  Pretty,
  Redacted,
  SchemaAST,
  SortedSet,
  Types
} from "effect"
import {
  Brand,
  Context,
  Effect,
  hole,
  identity,
  Number as N,
  Option,
  ParseResult,
  pipe,
  Schema as S,
  String as Str
} from "effect"
import { describe, expect, it } from "tstyche"

class A extends S.Class<A>("A")({ a: S.NonEmptyString }) {}
declare const anyNever: S.Schema<any>
declare const neverAny: S.Schema<never, any>
declare const anyNeverPropertySignature: S.PropertySignature<"?:", any, never, "?:", never, false>
declare const neverAnyPropertySignature: S.PropertySignature<"?:", never, never, "?:", any, false>
const ServiceA = Context.GenericTag<"ServiceA", string>("ServiceA")
declare const aContext: S.Schema<string, string, "a">
declare const bContext: S.Schema<number, number, "b">
declare const cContext: S.Schema<boolean, boolean, "c">

describe("Schema", () => {
  describe("SchemaClass", () => {
    it("the constructor should not be callable", () => {
      // @ts-expect-error
      new S.String()
    })
  })

  it("Schema.Encoded", () => {
    expect<S.Schema.Encoded<typeof S.Never>>().type.toBe<never>()
    expect<S.Schema.Encoded<typeof S.NumberFromString>>().type.toBe<string>()
  })

  it("Schema.Type", () => {
    expect<S.Schema.Type<typeof S.Never>>().type.toBe<never>()
    expect<S.Schema.Type<typeof S.NumberFromString>>().type.toBe<number>()
  })

  it("Schema.Context", () => {
    expect<S.Schema.Context<typeof S.Never>>().type.toBe<never>()
    expect<S.Schema.Context<S.Schema<number, string, "ctx">>>().type.toBe<"ctx">()
  })

  it("annotations", () => {
    // should allow to add custom string annotations to a schema
    expect(S.String.annotations({ a: 1 })).type.toBe<S.SchemaClass<string, string>>()
    // should allow to add custom symbol annotations to a schema
    expect(S.String.annotations({ [Symbol.for("a")]: 1 })).type.toBe<S.SchemaClass<string, string>>()

    interface AnnotatedString extends S.Annotable<AnnotatedString, string> {}
    const AnnotatedString = hole<AnnotatedString>()

    expect(hole<S.Schema<string>>().pipe(S.annotations({}))).type.toBe<S.Schema<string, string>>()
    expect(AnnotatedString.pipe(S.annotations({}))).type.toBe<AnnotatedString>()

    expect(S.Number.pipe(S.int(), S.brand("Int"), S.annotations({})))
      .type.toBe<S.brand<S.filter<S.Schema<number, number>>, "Int">>()
    expect(S.Struct({ a: AnnotatedString }).pipe(S.annotations({}))).type.toBe<S.Struct<{ a: AnnotatedString }>>()
    expect(A.pipe(S.annotations({}))).type.toBe<S.SchemaClass<A, { readonly a: string }>>()
    expect(S.Number.pipe(S.int(), S.brand("Int")).make(1)).type.toBe<number & Brand.Brand<"Int">>()
  })

  it("Primitives", () => {
    expect(S.asSchema(S.Void)).type.toBe<S.Schema<void, void>>()
    expect(S.Void).type.toBe<typeof S.Void>()

    expect(S.asSchema(S.Undefined)).type.toBe<S.Schema<undefined, undefined>>()
    expect(S.Undefined).type.toBe<typeof S.Undefined>()

    expect(S.asSchema(S.String)).type.toBe<S.Schema<string, string>>()
    expect(S.String).type.toBe<typeof S.String>()

    expect(S.asSchema(S.Number)).type.toBe<S.Schema<number, number>>()
    expect(S.Number).type.toBe<typeof S.Number>()

    expect(S.asSchema(S.Boolean)).type.toBe<S.Schema<boolean, boolean>>()
    expect(S.Boolean).type.toBe<typeof S.Boolean>()

    expect(S.asSchema(S.BigIntFromSelf)).type.toBe<S.Schema<bigint, bigint>>()
    expect(S.BigIntFromSelf).type.toBe<typeof S.BigIntFromSelf>()

    expect(S.asSchema(S.BigInt)).type.toBe<S.Schema<bigint, string>>()
    expect(S.BigInt).type.toBe<typeof S.BigInt>()

    expect(S.asSchema(S.SymbolFromSelf)).type.toBe<S.Schema<symbol, symbol>>()
    expect(S.SymbolFromSelf).type.toBe<typeof S.SymbolFromSelf>()

    expect(S.asSchema(S.Symbol)).type.toBe<S.Schema<symbol, string>>()
    expect(S.Symbol).type.toBe<typeof S.Symbol>()

    expect(S.asSchema(S.Unknown)).type.toBe<S.Schema<unknown, unknown>>()
    expect(S.Unknown).type.toBe<typeof S.Unknown>()

    expect(S.asSchema(S.Any)).type.toBe<S.Schema<any, any>>()
    expect(S.Any).type.toBe<typeof S.Any>()

    expect(S.asSchema(S.Object)).type.toBe<S.Schema<object, object>>()
    expect(S.Object).type.toBe<typeof S.Object>()
  })

  it("literals", () => {
    expect(S.asSchema(S.Null)).type.toBe<S.Schema<null, null>>()
    expect(S.Null).type.toBe<typeof S.Null>()

    expect(S.Literal()).type.toBe<S.Never>()
    expect(S.asSchema(S.Literal("a"))).type.toBe<S.Schema<"a", "a">>()
    expect(S.Literal("a")).type.toBe<S.Literal<["a"]>>()

    expect(S.asSchema(S.Literal("a", "b", "c"))).type.toBe<S.Schema<"a" | "b" | "c", "a" | "b" | "c">>()
    expect(S.Literal("a", "b", "c")).type.toBe<S.Literal<["a", "b", "c"]>>()

    const literals = hole<Array<"a" | "b" | "c">>()
    expect(S.Literal(...literals)).type.toBe<S.Schema<"a" | "b" | "c", "a" | "b" | "c">>()

    expect(S.Literal(1)).type.toBe<S.Literal<[1]>>()
    expect(S.Literal(2n)).type.toBe<S.Literal<[2n]>>()
    expect(S.Literal(true)).type.toBe<S.Literal<[true]>>()
    expect(S.Literal("A", "B")).type.toBe<S.Literal<["A", "B"]>>()
    expect(S.Literal("A", "B").literals).type.toBe<readonly ["A", "B"]>()
    expect(S.Literal("A", "B").annotations({})).type.toBe<S.Literal<["A", "B"]>>()
  })

  it("String", () => {
    expect(pipe(S.String, S.maxLength(5))).type.toBe<S.filter<S.Schema<string, string>>>()
    expect(pipe(S.String, S.minLength(5))).type.toBe<S.filter<S.Schema<string, string>>>()
    expect(pipe(S.String, S.length(5))).type.toBe<S.filter<S.Schema<string, string>>>()
    expect(pipe(S.String, S.pattern(/a/))).type.toBe<S.filter<S.Schema<string, string>>>()
    expect(pipe(S.String, S.startsWith("a"))).type.toBe<S.filter<S.Schema<string, string>>>()
    expect(pipe(S.String, S.endsWith("a"))).type.toBe<S.filter<S.Schema<string, string>>>()
    expect(pipe(S.String, S.includes("a"))).type.toBe<S.filter<S.Schema<string, string>>>()
  })

  it("Number", () => {
    expect(pipe(S.Number, S.greaterThan(5))).type.toBe<S.filter<S.Schema<number, number>>>()
    expect(pipe(S.Number, S.greaterThanOrEqualTo(5))).type.toBe<S.filter<S.Schema<number, number>>>()
    expect(pipe(S.Number, S.lessThan(5))).type.toBe<S.filter<S.Schema<number, number>>>()
    expect(pipe(S.Number, S.lessThanOrEqualTo(5))).type.toBe<S.filter<S.Schema<number, number>>>()
    expect(pipe(S.Number, S.int())).type.toBe<S.filter<S.Schema<number, number>>>()
    expect(pipe(S.Number, S.nonNaN())).type.toBe<S.filter<S.Schema<number, number>>>()
    expect(pipe(S.Number, S.finite())).type.toBe<S.filter<S.Schema<number, number>>>()
  })

  describe("Enums", () => {
    enum Fruits {
      Apple,
      Banana
    }

    const schema = S.Enums(Fruits)

    it("Schema Type", () => {
      expect(S.asSchema(schema)).type.toBeAssignableTo<S.Schema<Fruits>>()
      expect(schema).type.toBe<S.Enums<typeof Fruits>>()
    })

    it("should expose the enums field", () => {
      const enums = schema.enums
      expect(enums).type.toBe<typeof Fruits>()
      expect(enums.Apple).type.toBe<Fruits.Apple>()
      expect(enums.Banana).type.toBe<Fruits.Banana>()
    })
  })

  it("NullOr", () => {
    expect(S.asSchema(S.NullOr(S.String))).type.toBe<S.Schema<string | null, string | null>>()
    expect(S.NullOr(S.String)).type.toBe<S.NullOr<typeof S.String>>()
    expect(S.asSchema(S.NullOr(S.NumberFromString))).type.toBe<S.Schema<number | null, string | null>>()
    expect(S.NullOr(S.NumberFromString)).type.toBe<S.NullOr<typeof S.NumberFromString>>()
  })

  it("Union", () => {
    expect(S.Union(S.String, S.Never)).type.toBe<S.Union<[typeof S.String, typeof S.Never]>>()
    expect(S.Union(S.String, S.Number).annotations({})).type.toBe<S.Union<[typeof S.String, typeof S.Number]>>()
    expect(S.asSchema(S.Union(S.String, S.Number))).type.toBe<S.Schema<string | number, string | number>>()
    expect(S.Union(S.String, S.Number)).type.toBe<S.Union<[typeof S.String, typeof S.Number]>>()
    expect(S.asSchema(S.Union(S.Boolean, S.NumberFromString))).type.toBe<S.Schema<number | boolean, string | boolean>>()
    expect(S.Union(S.Boolean, S.NumberFromString)).type.toBe<S.Union<[typeof S.Boolean, typeof S.NumberFromString]>>()
    expect(S.Union(S.String, S.Number).members).type.toBe<readonly [typeof S.String, typeof S.Number]>()
  })

  it("keyof", () => {
    expect(S.keyof(S.Struct({ a: S.String, b: S.NumberFromString }))).type.toBe<S.SchemaClass<"a" | "b", "a" | "b">>()
  })

  describe("Tuple", () => {
    it("required elements", () => {
      expect(S.asSchema(S.Tuple(S.String, S.Number)))
        .type.toBe<S.Schema<readonly [string, number], readonly [string, number]>>()
      expect(S.Tuple(S.String, S.Number)).type.toBe<S.Tuple<[typeof S.String, typeof S.Number]>>()
      expect(S.asSchema(S.Tuple(S.String, S.NumberFromString)))
        .type.toBe<S.Schema<readonly [string, number], readonly [string, string]>>()
      expect(S.Tuple(S.String, S.NumberFromString)).type.toBe<S.Tuple<[typeof S.String, typeof S.NumberFromString]>>()
      expect(S.Tuple(S.String, S.Number).elements).type.toBe<readonly [typeof S.String, typeof S.Number]>()
      expect(S.Tuple(S.String, S.Number).rest).type.toBe<readonly []>()
    })

    it("required elements + rest", () => {
      expect(S.asSchema(S.Tuple([S.String], S.Number, S.Boolean))).type.toBe<
        S.Schema<readonly [string, ...Array<number>, boolean], readonly [string, ...Array<number>, boolean]>
      >()
      expect(S.Tuple([S.String], S.Number, S.Boolean)).type.toBe<
        S.TupleType<readonly [typeof S.String], [typeof S.Number, typeof S.Boolean]>
      >()
      expect(S.Tuple([S.String], S.Number).elements).type.toBe<readonly [typeof S.String]>()
      expect(S.Tuple([S.String], S.Number).rest).type.toBe<readonly [typeof S.Number]>()
      expect(S.Tuple([S.String], S.Number, S.Boolean).rest).type.toBe<readonly [typeof S.Number, typeof S.Boolean]>()
    })

    it("optional elements", () => {
      expect(S.asSchema(S.Tuple(S.String, S.Number, S.optionalElement(S.Boolean))))
        .type.toBe<S.Schema<readonly [string, number, boolean?], readonly [string, number, boolean?]>>()
      expect(S.Tuple(S.String, S.Number, S.optionalElement(S.Boolean)))
        .type.toBe<S.Tuple<[typeof S.String, typeof S.Number, S.Element<typeof S.Boolean, "?">]>>()
      expect(
        S.asSchema(S.Tuple(S.String, S.NumberFromString, S.optionalElement(S.NumberFromString)))
      ).type.toBe<S.Schema<readonly [string, number, number?], readonly [string, string, string?]>>()
      expect(
        S.Tuple(S.String, S.NumberFromString, S.optionalElement(S.NumberFromString))
      ).type.toBe<S.Tuple<[typeof S.String, typeof S.NumberFromString, S.Element<typeof S.NumberFromString, "?">]>>()
    })

    it("Array", () => {
      expect(S.asSchema(S.Array(S.Number))).type.toBe<S.Schema<ReadonlyArray<number>, ReadonlyArray<number>>>()
      expect(S.Array(S.Number)).type.toBe<S.Array$<typeof S.Number>>()
      expect(pipe(S.Number, S.Array)).type.toBe<S.Array$<typeof S.Number>>()
      expect(S.asSchema(S.Array(S.NumberFromString)))
        .type.toBe<S.Schema<ReadonlyArray<number>, ReadonlyArray<string>>>()
      expect(S.Array(S.NumberFromString)).type.toBe<S.Array$<typeof S.NumberFromString>>()
      expect(S.Array(S.String).value).type.toBe<typeof S.String>()
      expect(S.Array(S.String).elements).type.toBe<readonly []>()
      expect(S.Array(S.String).rest).type.toBe<readonly [typeof S.String]>()
    })
  })

  it("NonEmptyArray", () => {
    expect(S.asSchema(S.NonEmptyArray(S.Number))).type.toBe<
      S.Schema<readonly [number, ...Array<number>], readonly [number, ...Array<number>]>
    >()
    expect(S.NonEmptyArray(S.Number)).type.toBe<S.NonEmptyArray<typeof S.Number>>()
    expect(pipe(S.Number, S.NonEmptyArray)).type.toBe<S.NonEmptyArray<typeof S.Number>>()
    expect(S.asSchema(S.NonEmptyArray(S.NumberFromString))).type.toBe<
      S.Schema<readonly [number, ...Array<number>], readonly [string, ...Array<string>]>
    >()
    expect(S.NonEmptyArray(S.NumberFromString)).type.toBe<S.NonEmptyArray<typeof S.NumberFromString>>()
    expect(S.NonEmptyArray(S.String).value).type.toBe<typeof S.String>()
    expect(S.NonEmptyArray(S.String).elements).type.toBe<readonly [typeof S.String]>()
    expect(S.NonEmptyArray(S.String).rest).type.toBe<readonly [typeof S.String]>()
  })

  it("Struct", () => {
    expect(S.Struct({ a: S.String, b: S.Number }).fields)
      .type.toBe<{ readonly a: typeof S.String; readonly b: typeof S.Number }>()
    expect(S.Struct({ a: S.String, b: S.Number }).records).type.toBe<readonly []>()
    expect(S.Struct({ a: S.String, b: S.Number }).annotations({}).fields)
      .type.toBe<{ readonly a: typeof S.String; readonly b: typeof S.Number }>()
    expect(S.asSchema(S.Struct({ a: S.String, b: S.Number })))
      .type.toBe<S.Schema<{ readonly a: string; readonly b: number }, { readonly a: string; readonly b: number }>>()
    expect(S.Struct({ a: S.String, b: S.Number })).type.toBe<S.Struct<{ a: typeof S.String; b: typeof S.Number }>>()
    const MyModel = S.Struct({ a: S.String, b: S.NumberFromString })
    expect(S.asSchema(MyModel))
      .type.toBe<S.Schema<{ readonly a: string; readonly b: number }, { readonly a: string; readonly b: string }>>()
    type MyModelType = S.Schema.Type<typeof MyModel>
    type MyModelEncoded = S.Schema.Encoded<typeof MyModel>
    expect<MyModelType>().type.toBe<{ readonly a: string; readonly b: number }>()
    expect<MyModelEncoded>().type.toBe<{ readonly a: string; readonly b: string }>()
    expect(S.asSchema(S.Struct({ a: S.Never }))).type.toBe<S.Schema<{ readonly a: never }, { readonly a: never }>>()
    expect(S.Struct({ a: S.Never })).type.toBe<S.Struct<{ a: typeof S.Never }>>()
    expect(
      S.asSchema(S.Struct({ a: S.NumberFromString }, { key: S.String, value: S.NumberFromString }))
    ).type.toBe<
      S.Schema<
        { readonly [x: string]: number; readonly a: number },
        { readonly [x: string]: string; readonly a: string },
        never
      >
    >()
    expect(S.Struct({ a: S.NumberFromString }, { key: S.String, value: S.NumberFromString })).type.toBe<
      S.TypeLiteral<
        { a: typeof S.NumberFromString },
        readonly [{ readonly key: typeof S.String; readonly value: typeof S.NumberFromString }]
      >
    >()
    expect(S.Struct({ a: S.Number }, { key: S.String, value: S.Number }).records)
      .type.toBe<readonly [{ readonly key: typeof S.String; readonly value: typeof S.Number }]>()
    expect(
      S.asSchema(S.Struct({ a: S.Number }, { key: S.String, value: S.Number }, { key: S.Symbol, value: S.Number }))
    ).type.toBe<
      S.Schema<
        { readonly [x: string]: number; readonly [x: symbol]: number; readonly a: number },
        { readonly [x: string]: number; readonly a: number },
        never
      >
    >()
    expect(S.asSchema(S.Struct({ a: anyNever }))).type.toBe<S.Schema<{ readonly a: any }, { readonly a: any }>>()
    expect(S.asSchema(S.Struct({ a: neverAny }))).type.toBe<S.Schema<{ readonly a: never }, { readonly a: any }>>()
    expect(S.asSchema(S.Struct({ a: anyNeverPropertySignature })))
      .type.toBe<S.Schema<{ readonly a?: any }, { readonly a?: never }>>()
    expect(S.asSchema(S.Struct({ a: neverAnyPropertySignature })))
      .type.toBe<S.Schema<{ readonly a?: never }, { readonly a?: any }>>()
  })

  it("optional", () => {
    expect(S.optional(S.Never)).type.toBe<S.optional<typeof S.Never>>()
    expect(
      S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean) }))
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number; readonly c?: boolean | undefined },
        { readonly a: string; readonly b: number; readonly c?: boolean | undefined },
        never
      >
    >()
    expect(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean) }))
      .type.toBe<S.Struct<{ a: typeof S.String; b: typeof S.Number; c: S.optional<typeof S.Boolean> }>>()
    expect(
      S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.NumberFromString) }))
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number; readonly c?: number | undefined },
        { readonly a: string; readonly b: number; readonly c?: string | undefined },
        never
      >
    >()
    expect(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.NumberFromString) }))
      .type.toBe<S.Struct<{ a: typeof S.String; b: typeof S.Number; c: S.optional<typeof S.NumberFromString> }>>()
    expect(S.asSchema(S.Struct({ a: S.String.pipe(S.optional) })))
      .type.toBe<S.Schema<{ readonly a?: string | undefined }, { readonly a?: string | undefined }>>()
    expect(S.Struct({ a: S.String.pipe(S.optional) })).type.toBe<S.Struct<{ a: S.optional<typeof S.String> }>>()
  })

  it("optionalWith { exact: true }", () => {
    expect(
      S.asSchema(S.Struct({ a: S.optionalWith(S.Never, { exact: true }) }))
    ).type.toBe<S.Schema<{ readonly a?: never }, { readonly a?: never }>>()
    expect(S.Struct({ a: S.optionalWith(S.Never, { exact: true }) }))
      .type.toBe<S.Struct<{ a: S.optionalWith<typeof S.Never, { exact: true }> }>>()
    expect(
      S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { exact: true }) }))
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number; readonly c?: boolean },
        { readonly a: string; readonly b: number; readonly c?: boolean },
        never
      >
    >()
    expect(
      S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { exact: true }) }))
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number; readonly c?: number },
        { readonly a: string; readonly b: number; readonly c?: string },
        never
      >
    >()
    expect(S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ exact: true })) }))
      .type.toBe<S.Struct<{ a: S.optionalWith<S.Literal<["a", "b"]>, { exact: true }> }>>()
  })

  it("optionalWith - Errors", () => {
    // @ts-expect-error
    S.optionalWith(S.String, { as: "Option", default: () => "" })
    // @ts-expect-error
    S.optionalWith(S.String, { as: "Option", exact: true, onNoneEncoding: () => Option.some(null) })
    // @ts-expect-error
    S.String.pipe(S.optionalWith({ as: "Option", exact: true, onNoneEncoding: () => Option.some(null) }))
    // @ts-expect-error
    S.optionalWith(S.String, { as: "Option", exact: true, nullable: true, onNoneEncoding: () => Option.some(1) })
    // @ts-expect-error
    S.optionalWith(S.String, { as: "Option", onNoneEncoding: () => Option.some(null) })
    // @ts-expect-error
    S.String.pipe(S.optionalWith({ as: "Option", onNoneEncoding: () => Option.some(null) }))
    // @ts-expect-error
    S.String.pipe(S.optionalWith({ as: "Option", exact: true, nullable: true, onNoneEncoding: () => Option.some(1) }))
    // @ts-expect-error
    S.optionalWith(S.String, { as: "Option", nullable: true, onNoneEncoding: () => Option.some(1) })
    // @ts-expect-error
    S.String.pipe(S.optionalWith({ as: "Option", nullable: true, onNoneEncoding: () => Option.some(1) }))
    // @ts-expect-error
    S.optionalWith(S.String, { as: null })
    // @ts-expect-error
    S.optionalWith(S.String, { default: null })
  })

  it("optionalWith used in a generic context", () => {
    type TypeWithValue<Value extends S.Schema.Any> = { value: S.optionalWith<Value, { nullable: true }> }
    const makeTypeWithValue = <Value extends S.Schema.Any>(value: Value): TypeWithValue<Value> => ({
      value: S.optionalWith(value, { nullable: true })
    })
    expect(makeTypeWithValue(S.String)).type.toBe<TypeWithValue<typeof S.String>>()
  })

  it("optionalWith { exact: true, default: () => A }", () => {
    expect(
      S.asSchema(
        S.Struct({
          a: S.String,
          b: S.Number,
          c: S.optionalWith(S.Boolean, { exact: true, default: () => false })
        })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number; readonly c: boolean },
        { readonly a: string; readonly b: number; readonly c?: boolean },
        never
      >
    >()

    expect(
      S.Struct({
        a: S.String,
        b: S.Number,
        c: S.optionalWith(S.Boolean, { exact: true, default: () => false })
      })
    ).type.toBe<
      S.Struct<{
        a: typeof S.String
        b: typeof S.Number
        c: S.optionalWith<typeof S.Boolean, { exact: true; default: () => false }>
      }>
    >()

    expect(
      S.asSchema(
        S.Struct({
          a: S.String,
          b: S.Number,
          c: S.optionalWith(S.NumberFromString, { exact: true, default: () => 0 })
        })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number; readonly c: number },
        { readonly a: string; readonly b: number; readonly c?: string },
        never
      >
    >()

    expect(
      S.Struct({
        a: S.String,
        b: S.Number,
        c: S.optionalWith(S.NumberFromString, { exact: true, default: () => 0 })
      })
    ).type.toBe<
      S.Struct<{
        a: typeof S.String
        b: typeof S.Number
        c: S.optionalWith<typeof S.NumberFromString, { exact: true; default: () => number }>
      }>
    >()

    expect(
      S.Struct({ a: S.optionalWith(S.Literal("a", "b"), { default: () => "a", exact: true }) })
    ).type.toBe<
      S.Struct<{
        a: S.optionalWith<S.Literal<["a", "b"]>, { default: () => "a"; exact: true }>
      }>
    >()

    expect(
      S.asSchema(
        S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a", exact: true })) })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: "a" | "b" },
        { readonly a?: "a" | "b" },
        never
      >
    >()

    expect(
      S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a", exact: true })) })
    ).type.toBe<
      S.Struct<{
        a: S.optionalWith<S.Literal<["a", "b"]>, { default: () => "a"; exact: true }>
      }>
    >()
  })

  it("optionalWith { default: () => A }", () => {
    expect(
      S.asSchema(
        S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { default: () => false }) })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number; readonly c: boolean },
        { readonly a: string; readonly b: number; readonly c?: boolean | undefined },
        never
      >
    >()

    expect(
      S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { default: () => false }) })
    ).type.toBe<
      S.Struct<{
        a: typeof S.String
        b: typeof S.Number
        c: S.optionalWith<typeof S.Boolean, { default: () => false }>
      }>
    >()

    expect(
      S.asSchema(
        S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { default: () => 0 }) })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number; readonly c: number },
        { readonly a: string; readonly b: number; readonly c?: string | undefined },
        never
      >
    >()

    expect(
      S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { default: () => 0 }) })
    ).type.toBe<
      S.Struct<{
        a: typeof S.String
        b: typeof S.Number
        c: S.optionalWith<typeof S.NumberFromString, { default: () => number }>
      }>
    >()

    expect(
      S.Struct({ a: S.optionalWith(S.Literal("a", "b"), { default: () => "a" }) })
    ).type.toBe<
      S.Struct<{
        a: S.optionalWith<S.Literal<["a", "b"]>, { default: () => "a" }>
      }>
    >()

    expect(
      S.asSchema(
        S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a" })) })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: "a" | "b" },
        { readonly a?: "a" | "b" | undefined },
        never
      >
    >()

    expect(
      S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a" })) })
    ).type.toBe<
      S.Struct<{
        a: S.optionalWith<S.Literal<["a", "b"]>, { default: () => "a" }>
      }>
    >()
  })

  it("optionalWith { exact: true, nullable: true, default: () => A }", () => {
    expect(
      S.asSchema(
        S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: number },
        { readonly a?: string | null },
        never
      >
    >()

    expect(
      S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) })
    ).type.toBe<
      S.Struct<{
        a: S.optionalWith<typeof S.NumberFromString, { exact: true; nullable: true; default: () => number }>
      }>
    >()
  })

  it("optionalWith { nullable: true, default: () => A }", () => {
    expect(
      S.asSchema(
        S.Struct({ a: S.optionalWith(S.NumberFromString, { nullable: true, default: () => 0 }) })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: number },
        { readonly a?: string | null | undefined },
        never
      >
    >()

    expect(
      S.Struct({ a: S.optionalWith(S.NumberFromString, { nullable: true, default: () => 0 }) })
    ).type.toBe<
      S.Struct<{
        a: S.optionalWith<typeof S.NumberFromString, { nullable: true; default: () => number }>
      }>
    >()

    expect(
      S.asSchema(
        S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: number },
        { readonly a?: string | null },
        never
      >
    >()

    expect(
      S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) })
    ).type.toBe<
      S.Struct<{
        a: S.optionalWith<typeof S.NumberFromString, { exact: true; nullable: true; default: () => number }>
      }>
    >()

    expect(
      S.Struct({ a: S.optionalWith(S.Literal("a", "b"), { default: () => "a", nullable: true }) })
    ).type.toBe<
      S.Struct<{
        a: S.optionalWith<S.Literal<["a", "b"]>, { default: () => "a"; nullable: true }>
      }>
    >()

    expect(
      S.asSchema(
        S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a", nullable: true })) })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: "a" | "b" },
        { readonly a?: "a" | "b" | null | undefined },
        never
      >
    >()

    expect(
      S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a", nullable: true })) })
    ).type.toBe<
      S.Struct<{
        a: S.optionalWith<S.Literal<["a", "b"]>, { default: () => "a"; nullable: true }>
      }>
    >()
  })

  it("optionalWith { exact: true, as: 'Option' }", () => {
    expect(
      S.asSchema(
        S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { exact: true, as: "Option" }) })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number; readonly c: Option.Option<boolean> },
        { readonly a: string; readonly b: number; readonly c?: boolean },
        never
      >
    >()

    expect(
      S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { exact: true, as: "Option" }) })
    ).type.toBe<
      S.Struct<{
        a: typeof S.String
        b: typeof S.Number
        c: S.optionalWith<typeof S.Boolean, { exact: true; as: "Option" }>
      }>
    >()

    expect(
      S.asSchema(
        S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { exact: true, as: "Option" }) })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number; readonly c: Option.Option<number> },
        { readonly a: string; readonly b: number; readonly c?: string },
        never
      >
    >()

    expect(
      S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { exact: true, as: "Option" }) })
    ).type.toBe<
      S.Struct<{
        a: typeof S.String
        b: typeof S.Number
        c: S.optionalWith<typeof S.NumberFromString, { exact: true; as: "Option" }>
      }>
    >()

    expect(
      S.asSchema(S.Struct({ a: S.String.pipe(S.optionalWith({ exact: true, as: "Option" })) }))
    ).type.toBe<
      S.Schema<
        { readonly a: Option.Option<string> },
        { readonly a?: string },
        never
      >
    >()

    expect(
      S.Struct({ a: S.String.pipe(S.optionalWith({ exact: true, as: "Option" })) })
    ).type.toBe<
      S.Struct<{
        a: S.optionalWith<typeof S.String, { exact: true; as: "Option" }>
      }>
    >()
  })

  it("optionalWith { as: 'Option' }", () => {
    expect(
      S.asSchema(
        S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { as: "Option" }) })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number; readonly c: Option.Option<boolean> },
        { readonly a: string; readonly b: number; readonly c?: boolean | undefined },
        never
      >
    >()
    expect(
      S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { as: "Option" }) })
    ).type.toBe<
      S.Struct<{
        a: typeof S.String
        b: typeof S.Number
        c: S.optionalWith<typeof S.Boolean, { as: "Option" }>
      }>
    >()
    expect(
      S.asSchema(
        S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { as: "Option" }) })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number; readonly c: Option.Option<number> },
        { readonly a: string; readonly b: number; readonly c?: string | undefined },
        never
      >
    >()
    expect(
      S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { as: "Option" }) })
    ).type.toBe<
      S.Struct<{
        a: typeof S.String
        b: typeof S.Number
        c: S.optionalWith<typeof S.NumberFromString, { as: "Option" }>
      }>
    >()
    expect(
      S.asSchema(S.Struct({ a: S.String.pipe(S.optionalWith({ as: "Option" })) }))
    ).type.toBe<
      S.Schema<
        { readonly a: Option.Option<string> },
        { readonly a?: string | undefined },
        never
      >
    >()
    expect(
      S.Struct({ a: S.String.pipe(S.optionalWith({ as: "Option" })) })
    ).type.toBe<
      S.Struct<{
        a: S.optionalWith<typeof S.String, { as: "Option" }>
      }>
    >()
  })

  it("optionalWith { nullable: true, as: 'Option' }", () => {
    expect(
      S.asSchema(
        S.Struct({ a: S.optionalWith(S.NumberFromString, { nullable: true, as: "Option" }) })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: Option.Option<number> },
        { readonly a?: string | null | undefined },
        never
      >
    >()
    expect(
      S.Struct({ a: S.optionalWith(S.NumberFromString, { nullable: true, as: "Option" }) })
    ).type.toBe<
      S.Struct<{
        a: S.optionalWith<typeof S.NumberFromString, { nullable: true; as: "Option" }>
      }>
    >()
    expect(
      S.asSchema(S.Struct({ a: S.String.pipe(S.optionalWith({ nullable: true, as: "Option" })) }))
    ).type.toBe<
      S.Schema<
        { readonly a: Option.Option<string> },
        { readonly a?: string | null | undefined },
        never
      >
    >()
    expect(
      S.Struct({ a: S.String.pipe(S.optionalWith({ nullable: true, as: "Option" })) })
    ).type.toBe<
      S.Struct<{
        a: S.optionalWith<typeof S.String, { nullable: true; as: "Option" }>
      }>
    >()
  })

  it("optionalWith { exact: true, nullable: true, as: 'Option' }", () => {
    expect(
      S.asSchema(
        S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, as: "Option" }) })
      )
    ).type.toBe<
      S.Schema<
        { readonly a: Option.Option<number> },
        { readonly a?: string | null },
        never
      >
    >()
    expect(
      S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, as: "Option" }) })
    ).type.toBe<
      S.Struct<{
        a: S.optionalWith<typeof S.NumberFromString, { exact: true; nullable: true; as: "Option" }>
      }>
    >()
    expect(
      S.asSchema(S.Struct({ a: S.String.pipe(S.optionalWith({ exact: true, nullable: true, as: "Option" })) }))
    ).type.toBe<
      S.Schema<
        { readonly a: Option.Option<string> },
        { readonly a?: string | null },
        never
      >
    >()
    expect(
      S.Struct({ a: S.String.pipe(S.optionalWith({ exact: true, nullable: true, as: "Option" })) })
    ).type.toBe<
      S.Struct<{
        a: S.optionalWith<typeof S.String, { exact: true; nullable: true; as: "Option" }>
      }>
    >()
  })

  it("pick", () => {
    // @ts-expect-error
    pipe(S.Struct({ a: S.propertySignature(S.Number).pipe(S.fromKey("c")) }), S.pick("a"))
    expect(
      pipe(S.Struct({ a: S.String, b: S.Number, c: S.Boolean }), S.pick("a", "b"))
    ).type.toBe<
      S.SchemaClass<{ readonly a: string; readonly b: number }, { readonly a: string; readonly b: number }>
    >()
    expect(
      pipe(S.Struct({ a: S.String, b: S.NumberFromString, c: S.Boolean }), S.pick("a", "b"))
    ).type.toBe<
      S.SchemaClass<{ readonly a: string; readonly b: number }, { readonly a: string; readonly b: string }>
    >()
  })

  it("pick - optionalWith", () => {
    expect(
      pipe(
        S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.Number, c: S.Boolean }),
        S.pick("a", "b")
      )
    ).type.toBe<
      S.SchemaClass<{ readonly a?: string; readonly b: number }, { readonly a?: string; readonly b: number }>
    >()
    expect(
      pipe(
        S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.NumberFromString, c: S.Boolean }),
        S.pick("a", "b")
      )
    ).type.toBe<
      S.SchemaClass<{ readonly a?: string; readonly b: number }, { readonly a?: string; readonly b: string }>
    >()
    expect(
      pipe(
        S.Struct({
          a: S.optionalWith(S.String, { exact: true, default: () => "" }),
          b: S.NumberFromString,
          c: S.Boolean
        }),
        S.pick("a", "b")
      )
    ).type.toBe<
      S.SchemaClass<{ readonly a: string; readonly b: number }, { readonly a?: string; readonly b: string }>
    >()
  })

  it("Struct.pick", () => {
    // @ts-expect-error
    S.Struct({ a: S.String }).pick("c")
    // @ts-expect-error
    S.Struct({ a: S.propertySignature(S.String).pipe(S.fromKey("c")) }).pick("c")

    expect(S.Struct({ a: S.String, b: S.Number, c: S.Boolean }).pick("a", "b"))
      .type.toBe<S.Struct<{ a: typeof S.String; b: typeof S.Number }>>()
  })

  it("omit", () => {
    // @ts-expect-error
    pipe(S.Struct({ a: S.propertySignature(S.Number).pipe(S.fromKey("c")) }), S.omit("a"))
    expect(
      pipe(S.Struct({ a: S.String, b: S.Number, c: S.Boolean }), S.omit("c"))
    ).type.toBe<
      S.SchemaClass<{ readonly a: string; readonly b: number }, { readonly a: string; readonly b: number }>
    >()
    expect(
      pipe(S.Struct({ a: S.String, b: S.NumberFromString, c: S.Boolean }), S.omit("c"))
    ).type.toBe<
      S.SchemaClass<{ readonly a: string; readonly b: number }, { readonly a: string; readonly b: string }>
    >()
  })

  it("omit - optionalWith", () => {
    expect(
      pipe(
        S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.Number, c: S.Boolean }),
        S.omit("c")
      )
    ).type.toBe<
      S.SchemaClass<{ readonly a?: string; readonly b: number }, { readonly a?: string; readonly b: number }>
    >()
    expect(
      pipe(
        S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.NumberFromString, c: S.Boolean }),
        S.omit("c")
      )
    ).type.toBe<
      S.SchemaClass<{ readonly a?: string; readonly b: number }, { readonly a?: string; readonly b: string }>
    >()
    expect(
      pipe(
        S.Struct({
          a: S.optionalWith(S.String, { exact: true, default: () => "" }),
          b: S.NumberFromString,
          c: S.Boolean
        }),
        S.omit("c")
      )
    ).type.toBe<
      S.SchemaClass<{ readonly a: string; readonly b: number }, { readonly a?: string; readonly b: string }>
    >()
  })

  it("Struct.omit", () => {
    // @ts-expect-error
    S.Struct({ a: S.String }).omit("c")
    // @ts-expect-error
    S.Struct({ a: S.propertySignature(S.String).pipe(S.fromKey("c")) }).omit("c")

    expect(S.Struct({ a: S.String, b: S.Number, c: S.Boolean }).omit("c"))
      .type.toBe<S.Struct<{ a: typeof S.String; b: typeof S.Number }>>()
    expect(S.Struct({ a: S.Number, b: S.Number.pipe(S.propertySignature, S.fromKey("c")) }).omit("b"))
      .type.toBe<S.Struct<{ a: typeof S.Number }>>()
  })

  it("brand", () => {
    expect(S.asSchema(pipe(S.Number, S.int(), S.brand("Int"))))
      .type.toBe<S.Schema<number & Brand.Brand<"Int">, number>>()
    expect(S.asSchema(pipe(S.Number, S.int(), S.brand("Int"))).annotations({}))
      .type.toBe<S.Schema<number & Brand.Brand<"Int">, number>>()
    expect(pipe(S.Number, S.int(), S.brand("Int")))
      .type.toBe<S.brand<S.filter<S.Schema<number, number>>, "Int">>()
    expect(S.asSchema(pipe(S.NumberFromString, S.int(), S.brand("Int"))))
      .type.toBe<S.Schema<number & Brand.Brand<"Int">, string>>()
    expect(pipe(S.NumberFromString, S.int(), S.brand("Int")))
      .type.toBe<S.brand<S.filter<S.Schema<number, string>>, "Int">>()
  })

  it("partial", () => {
    expect(S.partial(S.Struct({ a: S.String, b: S.Number })))
      .type.toBe<
      S.SchemaClass<
        { readonly a?: string | undefined; readonly b?: number | undefined },
        { readonly a?: string | undefined; readonly b?: number | undefined },
        never
      >
    >()
    expect(S.partial(S.Struct({ a: S.String, b: S.NumberFromString })))
      .type.toBe<
      S.SchemaClass<
        { readonly a?: string | undefined; readonly b?: number | undefined },
        { readonly a?: string | undefined; readonly b?: string | undefined },
        never
      >
    >()
    expect(S.Struct({ a: S.String, b: S.Number }).pipe(S.partial))
      .type.toBe<
      S.SchemaClass<
        { readonly a?: string | undefined; readonly b?: number | undefined },
        { readonly a?: string | undefined; readonly b?: number | undefined },
        never
      >
    >()
  })

  it("partialWith", () => {
    expect(S.partialWith(S.Struct({ a: S.String, b: S.Number }), { exact: true }))
      .type.toBe<
      S.SchemaClass<
        { readonly a?: string; readonly b?: number },
        { readonly a?: string; readonly b?: number },
        never
      >
    >()
    expect(S.partialWith(S.Struct({ a: S.String, b: S.NumberFromString }), { exact: true }))
      .type.toBe<
      S.SchemaClass<
        { readonly a?: string; readonly b?: number },
        { readonly a?: string; readonly b?: string },
        never
      >
    >()
    expect(S.Struct({ a: S.String, b: S.Number }).pipe(S.partialWith({ exact: true })))
      .type.toBe<
      S.SchemaClass<
        { readonly a?: string; readonly b?: number },
        { readonly a?: string; readonly b?: number },
        never
      >
    >()
  })

  it("required with optionalWith", () => {
    expect(
      S.required(
        S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.optionalWith(S.Number, { exact: true }) })
      )
    ).type.toBe<
      S.SchemaClass<
        { readonly a: string; readonly b: number },
        { readonly a: string; readonly b: number },
        never
      >
    >()
    expect(
      S.required(
        S.Struct({
          a: S.optionalWith(S.String, { exact: true }),
          b: S.NumberFromString,
          c: S.optionalWith(S.NumberFromString, { exact: true })
        })
      )
    ).type.toBe<
      S.SchemaClass<
        { readonly a: string; readonly b: number; readonly c: number },
        { readonly a: string; readonly b: string; readonly c: string },
        never
      >
    >()
  })

  it("Records", () => {
    expect(S.asSchema(S.Record({ key: S.String, value: S.String }).key)).type.toBe<S.Schema<string, string>>()
    expect(S.Record({ key: S.String, value: S.String }).key).type.toBe<typeof S.String>()
    expect(S.asSchema(S.Record({ key: S.String, value: S.String }).value)).type.toBe<S.Schema<string, string>>()
    expect(S.Record({ key: S.String, value: S.String }).value).type.toBe<typeof S.String>()
    expect(S.asSchema(S.Record({ key: S.String, value: S.String })))
      .type.toBe<
      S.Schema<
        { readonly [x: string]: string },
        { readonly [x: string]: string },
        never
      >
    >()
    expect(S.Record({ key: S.String, value: S.String })).type.toBe<S.Record$<typeof S.String, typeof S.String>>()
    expect(S.asSchema(S.Record({ key: S.String, value: S.NumberFromString })))
      .type.toBe<
      S.Schema<
        { readonly [x: string]: number },
        { readonly [x: string]: string },
        never
      >
    >()
    expect(S.Record({ key: S.String, value: S.NumberFromString }))
      .type.toBe<S.Record$<typeof S.String, typeof S.NumberFromString>>()
    expect(S.asSchema(S.Record({ key: pipe(S.String, S.minLength(2)), value: S.String })))
      .type.toBe<
      S.Schema<
        { readonly [x: string]: string },
        { readonly [x: string]: string },
        never
      >
    >()
    expect(S.Record({ key: pipe(S.String, S.minLength(2)), value: S.String }))
      .type.toBe<S.Record$<S.filter<S.Schema<string, string>>, typeof S.String>>()
    expect(S.asSchema(S.Record({ key: S.Union(S.Literal("a"), S.Literal("b")), value: S.String })))
      .type.toBe<
      S.Schema<
        { readonly a: string; readonly b: string },
        { readonly a: string; readonly b: string },
        never
      >
    >()
    expect(S.Record({ key: S.Union(S.Literal("a"), S.Literal("b")), value: S.String }))
      .type.toBe<S.Record$<S.Union<[S.Literal<["a"]>, S.Literal<["b"]>]>, typeof S.String>>()
    expect(S.asSchema(S.Record({ key: S.SymbolFromSelf, value: S.String })))
      .type.toBe<
      S.Schema<
        { readonly [x: symbol]: string },
        { readonly [x: symbol]: string },
        never
      >
    >()
    expect(S.Record({ key: S.SymbolFromSelf, value: S.String }))
      .type.toBe<S.Record$<typeof S.SymbolFromSelf, typeof S.String>>()
    expect(S.asSchema(S.Record({ key: S.TemplateLiteral(S.Literal("a"), S.String), value: S.String })))
      .type.toBe<
      S.Schema<
        { readonly [x: `a${string}`]: string },
        { readonly [x: `a${string}`]: string },
        never
      >
    >()
    expect(S.Record({ key: S.TemplateLiteral(S.Literal("a"), S.String), value: S.String }))
      .type.toBe<S.Record$<S.TemplateLiteral<`a${string}`>, typeof S.String>>()
    expect(S.asSchema(S.Record({ key: S.String.pipe(S.brand("UserId")), value: S.String })))
      .type.toBe<
      S.Schema<
        { readonly [x: string & Brand.Brand<"UserId">]: string },
        { readonly [x: string]: string },
        never
      >
    >()
    expect(S.Record({ key: S.String.pipe(S.brand("UserId")), value: S.String }))
      .type.toBe<S.Record$<S.brand<typeof S.String, "UserId">, typeof S.String>>()
    expect(S.asSchema(S.Record({ key: S.String.pipe(S.brand(Symbol.for("UserId"))), value: S.String })))
      .type.toBe<
      S.Schema<
        { readonly [x: string & Brand.Brand<symbol>]: string },
        { readonly [x: string]: string },
        never
      >
    >()
    expect(S.Record({ key: S.String.pipe(S.brand(Symbol.for("UserId"))), value: S.String }))
      .type.toBe<S.Record$<S.brand<typeof S.String, symbol>, typeof S.String>>()
  })

  it("extend", () => {
    expect(
      S.asSchema(
        pipe(
          S.Struct({ a: S.String, b: S.String }),
          S.extend(S.Struct({ c: S.String }))
        )
      )
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: string } & { readonly c: string },
        { readonly a: string; readonly b: string } & { readonly c: string },
        never
      >
    >()
    expect(
      pipe(
        S.Struct({ a: S.String, b: S.String }),
        S.extend(S.Struct({ c: S.String }))
      )
    ).type.toBe<S.extend<S.Struct<{ a: typeof S.String; b: typeof S.String }>, S.Struct<{ c: typeof S.String }>>>()
    expect(
      S.asSchema(S.extend(S.Struct({ a: S.String, b: S.String }), S.Struct({ c: S.String })))
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: string } & { readonly c: string },
        { readonly a: string; readonly b: string } & { readonly c: string },
        never
      >
    >()
    expect(
      S.extend(S.Struct({ a: S.String, b: S.String }), S.Struct({ c: S.String }))
    ).type.toBe<S.extend<S.Struct<{ a: typeof S.String; b: typeof S.String }>, S.Struct<{ c: typeof S.String }>>>()
    expect(
      S.asSchema(
        S.extend(S.Struct({ a: S.String }), S.Union(S.Struct({ b: S.Number }), S.Struct({ c: S.Boolean })))
      )
    ).type.toBe<
      S.Schema<
        { readonly a: string } & ({ readonly b: number } | { readonly c: boolean }),
        { readonly a: string } & ({ readonly b: number } | { readonly c: boolean }),
        never
      >
    >()
    expect(
      S.extend(S.Struct({ a: S.String }), S.Union(S.Struct({ b: S.Number }), S.Struct({ c: S.Boolean })))
    ).type.toBe<
      S.extend<
        S.Struct<{ a: typeof S.String }>,
        S.Union<[S.Struct<{ b: typeof S.Number }>, S.Struct<{ c: typeof S.Boolean }>]>
      >
    >()
    expect(
      S.asSchema(
        pipe(
          S.Struct({ a: S.String, b: S.String }),
          S.extend(S.Struct({ c: S.String })),
          S.extend(S.Record({ key: S.String, value: S.String }))
        )
      )
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: string } & { readonly c: string } & { readonly [x: string]: string }
      >
    >()
    expect(
      pipe(
        S.Struct({ a: S.String, b: S.String }),
        S.extend(S.Struct({ c: S.String })),
        S.extend(S.Record({ key: S.String, value: S.String }))
      )
    ).type.toBe<
      S.extend<
        S.extend<S.Struct<{ a: typeof S.String; b: typeof S.String }>, S.Struct<{ c: typeof S.String }>>,
        S.Record$<typeof S.String, typeof S.String>
      >
    >()
  })

  it("suspend", () => {
    interface SuspendIEqualA {
      readonly a: number
      readonly as: ReadonlyArray<SuspendIEqualA>
    }
    const SuspendIEqualA = S.Struct({
      a: S.Number,
      as: S.Array(S.suspend((): S.Schema<SuspendIEqualA> => SuspendIEqualA))
    })
    expect(SuspendIEqualA.fields)
      .type.toBe<
      { readonly a: typeof S.Number; readonly as: S.Array$<S.suspend<SuspendIEqualA, SuspendIEqualA, never>> }
    >()

    interface SuspendINotEqualA_A {
      readonly a: string
      readonly as: ReadonlyArray<SuspendINotEqualA_A>
    }
    interface SuspendINotEqualA_I {
      readonly a: number
      readonly as: ReadonlyArray<SuspendINotEqualA_I>
    }
    const SuspendINotEqualA = S.Struct({
      a: S.NumberFromString,
      as: S.Array(S.suspend((): S.Schema<SuspendINotEqualA_I, SuspendINotEqualA_A> => SuspendINotEqualA))
    })
    expect(SuspendINotEqualA.fields).type.toBe<
      {
        readonly a: typeof S.NumberFromString
        readonly as: S.Array$<S.suspend<SuspendINotEqualA_I, SuspendINotEqualA_A, never>>
      }
    >()
  })

  it("rename", () => {
    expect(S.rename(S.Struct({ a: S.String, b: S.Number }), {}))
      .type.toBe<
      S.SchemaClass<
        { readonly a: string; readonly b: number },
        { readonly a: string; readonly b: number },
        never
      >
    >()
    expect(S.rename(S.Struct({ a: S.String, b: S.Number }), { a: "c" }))
      .type.toBe<
      S.SchemaClass<
        { readonly c: string; readonly b: number },
        { readonly a: string; readonly b: number },
        never
      >
    >()
    expect(S.rename(S.Struct({ a: S.String, b: S.Number }), { a: "c", b: "d" }))
      .type.toBe<
      S.SchemaClass<
        { readonly c: string; readonly d: number },
        { readonly a: string; readonly b: number },
        never
      >
    >()
    const a = Symbol.for("effect/Schema/dtslint/a")
    expect(S.rename(S.Struct({ a: S.String, b: S.Number }), { a }))
      .type.toBe<
      S.SchemaClass<
        { readonly [a]: string; readonly b: number },
        { readonly a: string; readonly b: number },
        never
      >
    >()
    // @ts-expect-error
    S.rename(S.Struct({ a: S.String, b: S.Number }), { c: "d" })
    // @ts-expect-error
    S.rename(S.Struct({ a: S.String, b: S.Number }), { a: "c", d: "e" })
    expect(S.Struct({ a: S.String, b: S.Number }).pipe(S.rename({})))
      .type.toBe<
      S.SchemaClass<
        { readonly a: string; readonly b: number },
        { readonly a: string; readonly b: number },
        never
      >
    >()
    expect(S.Struct({ a: S.String, b: S.Number }).pipe(S.rename({ a: "c" })))
      .type.toBe<
      S.SchemaClass<
        { readonly c: string; readonly b: number },
        { readonly a: string; readonly b: number },
        never
      >
    >()
    // @ts-expect-error
    S.Struct({ a: S.String, b: S.Number }).pipe(S.rename({ c: "d" }))
    // @ts-expect-error
    S.Struct({ a: S.String, b: S.Number }).pipe(S.rename({ a: "c", d: "e" }))
  })

  it("InstanceOf", () => {
    class Test {
      constructor(readonly name: string) {}
    }
    expect(S.asSchema(S.instanceOf(Test))).type.toBe<S.Schema<Test, Test>>()
    expect(S.instanceOf(Test)).type.toBe<S.instanceOf<Test>>()
  })

  it("TemplateLiteral", () => {
    expect(S.TemplateLiteral("a"))
      .type.toBe<S.TemplateLiteral<"a">>()
    expect(S.TemplateLiteral(S.Literal("a")))
      .type.toBe<S.TemplateLiteral<"a">>()
    expect(S.TemplateLiteral(1))
      .type.toBe<S.TemplateLiteral<"1">>()
    expect(S.TemplateLiteral(S.Literal(1)))
      .type.toBe<S.TemplateLiteral<"1">>()
    expect(S.TemplateLiteral(S.String))
      .type.toBe<S.TemplateLiteral<string>>()
    expect(S.TemplateLiteral(S.Number))
      .type.toBe<S.TemplateLiteral<`${number}`>>()
    expect(S.TemplateLiteral("a", "b"))
      .type.toBe<S.TemplateLiteral<"ab">>()
    expect(S.TemplateLiteral(S.Literal("a"), S.Literal("b")))
      .type.toBe<S.TemplateLiteral<"ab">>()
    expect(S.TemplateLiteral("a", S.String))
      .type.toBe<S.TemplateLiteral<`a${string}`>>()
    expect(S.TemplateLiteral(S.Literal("a"), S.String))
      .type.toBe<S.TemplateLiteral<`a${string}`>>()
    expect(S.TemplateLiteral("a", S.Number))
      .type.toBe<S.TemplateLiteral<`a${number}`>>()
    expect(S.TemplateLiteral(S.Literal("a"), S.Number))
      .type.toBe<S.TemplateLiteral<`a${number}`>>()
    expect(S.TemplateLiteral(S.String, "a"))
      .type.toBe<S.TemplateLiteral<`${string}a`>>()
    expect(S.TemplateLiteral(S.String, S.Literal("a")))
      .type.toBe<S.TemplateLiteral<`${string}a`>>()
    expect(S.TemplateLiteral(S.Number, "a"))
      .type.toBe<S.TemplateLiteral<`${number}a`>>()
    expect(S.TemplateLiteral(S.Number, S.Literal("a")))
      .type.toBe<S.TemplateLiteral<`${number}a`>>()
    expect(S.TemplateLiteral(S.String, 0))
      .type.toBe<S.TemplateLiteral<`${string}0`>>()
    expect(S.TemplateLiteral(S.String, true))
      .type.toBe<S.TemplateLiteral<`${string}true`>>()
    expect(S.TemplateLiteral(S.String, null))
      .type.toBe<S.TemplateLiteral<`${string}null`>>()
    expect(S.TemplateLiteral(S.String, 1n))
      .type.toBe<S.TemplateLiteral<`${string}1`>>()
    expect(S.TemplateLiteral(S.String, S.Literal("a", 0)))
      .type.toBe<S.TemplateLiteral<`${string}a` | `${string}0`>>()
    expect(S.TemplateLiteral(S.String, S.Literal("/"), S.Number))
      .type.toBe<S.TemplateLiteral<`${string}/${number}`>>()
    expect(S.TemplateLiteral(S.String, "/", S.Number))
      .type.toBe<S.TemplateLiteral<`${string}/${number}`>>()
    const EmailLocaleIDs = S.Literal("welcome_email", "email_heading")
    const FooterLocaleIDs = S.Literal("footer_title", "footer_sendoff")
    expect(S.asSchema(S.TemplateLiteral(S.Union(EmailLocaleIDs, FooterLocaleIDs), S.Literal("_id"))))
      .type.toBe<
      S.Schema<
        "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id",
        "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id",
        never
      >
    >()
    expect(S.TemplateLiteral(S.Union(EmailLocaleIDs, FooterLocaleIDs), "_id"))
      .type.toBe<
      S.TemplateLiteral<
        "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id"
      >
    >()
    expect(S.TemplateLiteral(S.String.pipe(S.brand("MyBrand"))))
      .type.toBe<S.TemplateLiteral<`${string & Brand.Brand<"MyBrand">}`>>()
    expect(S.TemplateLiteral(S.Number.pipe(S.brand("MyBrand"))))
      .type.toBe<S.TemplateLiteral<`${number & Brand.Brand<"MyBrand">}`>>()
    expect(S.TemplateLiteral("a", S.String.pipe(S.brand("MyBrand"))))
      .type.toBe<S.TemplateLiteral<`a${string & Brand.Brand<"MyBrand">}`>>()
    expect(S.TemplateLiteral(S.Literal("a"), S.String.pipe(S.brand("MyBrand"))))
      .type.toBe<S.TemplateLiteral<`a${string & Brand.Brand<"MyBrand">}`>>()
    expect(S.TemplateLiteral(S.Literal("a").pipe(S.brand("L")), S.String.pipe(S.brand("MyBrand"))))
      .type.toBe<S.TemplateLiteral<`${"a" & Brand.Brand<"L">}${string & Brand.Brand<"MyBrand">}`>>()
    expect(S.TemplateLiteral("a", S.Number.pipe(S.brand("MyBrand"))))
      .type.toBe<S.TemplateLiteral<`a${number & Brand.Brand<"MyBrand">}`>>()
    expect(S.TemplateLiteral(S.Literal("a"), S.Number.pipe(S.brand("MyBrand"))))
      .type.toBe<S.TemplateLiteral<`a${number & Brand.Brand<"MyBrand">}`>>()
    expect(S.TemplateLiteral("a", S.Union(S.Number, S.String)))
      .type.toBe<S.TemplateLiteral<`a${string}` | `a${number}`>>()
  })

  it("attachPropertySignature", () => {
    expect(
      pipe(S.Struct({ radius: S.Number }), S.attachPropertySignature("kind", "circle"))
    ).type.toBe<
      S.SchemaClass<
        { readonly radius: number; readonly kind: "circle" },
        { readonly radius: number },
        never
      >
    >()
    expect(
      pipe(S.Struct({ radius: S.NumberFromString }), S.attachPropertySignature("kind", "circle"))
    ).type.toBe<
      S.SchemaClass<
        { readonly radius: number; readonly kind: "circle" },
        { readonly radius: string },
        never
      >
    >()
    expect(S.attachPropertySignature(S.Struct({ radius: S.Number }), "kind", "circle"))
      .type.toBe<
      S.SchemaClass<
        { readonly radius: number; readonly kind: "circle" },
        { readonly radius: number },
        never
      >
    >()
    expect(S.attachPropertySignature(S.Struct({ radius: S.NumberFromString }), "kind", "circle"))
      .type.toBe<
      S.SchemaClass<
        { readonly radius: number; readonly kind: "circle" },
        { readonly radius: string },
        never
      >
    >()
    const taggedStruct = <Name extends SchemaAST.LiteralValue | symbol, Fields extends S.Struct.Fields>(
      name: Name,
      fields: Fields
    ) => S.Struct(fields).pipe(S.attachPropertySignature("_tag", name))
    expect(taggedStruct("A", { a: S.String }))
      .type.toBe<
      S.SchemaClass<
        { readonly a: string; readonly _tag: "A" },
        { readonly a: string },
        never
      >
    >()
  })

  it("filter", () => {
    S.String.pipe(S.filter((s, options, ast) => {
      expect(s).type.toBe<string>()
      expect(options).type.toBe<SchemaAST.ParseOptions>()
      expect(ast).type.toBe<SchemaAST.Refinement>()
      return undefined
    }))
    const predicateFilter1 = (u: unknown): boolean => typeof u === "string"
    const FromFilter = S.Union(S.String, S.Number)
    expect(pipe(FromFilter, S.filter(predicateFilter1)))
      .type.toBe<S.filter<S.Union<[typeof S.String, typeof S.Number]>>>()
    const FromRefinement = S.Struct({
      a: S.optionalWith(S.String, { exact: true }),
      b: S.optionalWith(S.Number, { exact: true })
    })
    expect(pipe(FromRefinement, S.filter(S.is(S.Struct({ b: S.Number })))))
      .type.toBe<
      S.refine<
        { readonly a?: string; readonly b?: number } & { readonly b: number },
        S.Schema<unknown, { readonly a?: string; readonly b?: number }>
      >
    >()
    const LiteralFilter = S.Literal("a", "b")
    const predicateFilter2 = (u: unknown): u is "a" => typeof u === "string" && u === "a"
    expect(pipe(LiteralFilter, S.filter(predicateFilter2)))
      .type.toBe<S.refine<"a", S.Schema<unknown, "a" | "b">>>()
    expect(pipe(LiteralFilter, S.filter(S.is(S.Literal("a")))))
      .type.toBe<S.refine<"a", S.Schema<unknown, "a" | "b">>>()
    expect(pipe(LiteralFilter, S.filter(S.is(S.Literal("c")))))
      .type.toBe<S.refine<never, S.Schema<unknown, "a" | "b">>>()
    const UnionFilter = hole<
      S.Schema<
        { readonly a: string } | { readonly b: string },
        { readonly a: string } | { readonly b: string },
        never
      >
    >()
    expect(pipe(UnionFilter, S.filter(S.is(S.Struct({ b: S.String })))))
      .type.toBe<
      S.refine<
        ({ readonly a: string } | { readonly b: string }) & { readonly b: string },
        S.Schema<unknown, { readonly a: string } | { readonly b: string }>
      >
    >()
    expect(pipe(S.Number, S.filter((n): n is number & Brand.Brand<"MyNumber"> => n > 0)))
      .type.toBe<S.refine<number & Brand.Brand<"MyNumber">, S.Schema<number, number>>>()
    // annotations
    pipe(
      S.String,
      S.filter(
        (s) => {
          expect(s).type.toBe<string>()
          return true
        },
        {
          arbitrary: (from, ctx) => (fc) => {
            expect(from).type.toBe<Arbitrary.LazyArbitrary<string>>()
            expect(ctx).type.toBe<Arbitrary.ArbitraryGenerationContext>()
            return fc.string()
          },
          pretty: (from) => (s) => {
            expect(from).type.toBe<Pretty.Pretty<string>>()
            expect(s).type.toBe<string>()
            return s
          },
          equivalence: (from) => (a, b) => {
            expect(from).type.toBe<Equivalence.Equivalence<string>>()
            expect(a).type.toBe<string>()
            expect(b).type.toBe<string>()
            return true
          }
        }
      )
    )
    pipe(
      S.String,
      S.filter((s) => {
        expect(s).type.toBe<string>()
        return true
      })
    ).annotations({
      arbitrary: (...x) => (fc) => {
        expect(x).type.toBe<Array<any>>()
        return fc.string()
      },
      pretty: (...x) => (s) => {
        expect(x).type.toBe<Array<any>>()
        return s
      },
      equivalence: (...x) => (a, b) => {
        expect(x).type.toBe<Array<any>>()
        expect(a).type.toBe<string>()
        expect(b).type.toBe<string>()
        return true
      }
    })
  })

  it("filterEffect", () => {
    expect(
      S.String.pipe(S.filterEffect((s) => {
        expect(s).type.toBe<string>()
        return Effect.succeed(undefined)
      }))
    ).type.toBe<S.filterEffect<typeof S.String>>()
    expect(
      S.filterEffect(S.String, (s) => {
        expect(s).type.toBe<string>()
        return Effect.succeed(undefined)
      })
    ).type.toBe<S.filterEffect<typeof S.String>>()

    expect(
      S.String.pipe(
        S.filterEffect((s) =>
          Effect.gen(function*() {
            const str = yield* ServiceA
            return str === s
          })
        )
      )
    ).type.toBe<S.filterEffect<typeof S.String, "ServiceA">>()
    expect(
      S.filterEffect(S.String, (s) =>
        Effect.gen(function*() {
          const str = yield* ServiceA
          return str === s
        }))
    ).type.toBe<S.filterEffect<typeof S.String, "ServiceA">>()
  })

  it("compose", () => {
    expect(S.compose(S.split(","), S.Array(S.NumberFromString)))
      .type.toBe<S.SchemaClass<ReadonlyArray<number>, string>>()
    expect(S.split(",").pipe(S.compose(S.Array(S.NumberFromString))))
      .type.toBe<S.SchemaClass<ReadonlyArray<number>, string>>()
    expect(S.compose(S.split(","), S.Array(S.NumberFromString), { strict: true }))
      .type.toBe<S.SchemaClass<ReadonlyArray<number>, string>>()
    expect(S.split(",").pipe(S.compose(S.Array(S.NumberFromString), { strict: true })))
      .type.toBe<S.SchemaClass<ReadonlyArray<number>, string>>()
    // @ts-expect-error
    S.compose(S.String, S.Number)
    // @ts-expect-error
    S.String.pipe(S.compose(S.Number))
    expect(S.compose(S.Union(S.Null, S.String), S.NumberFromString))
      .type.toBe<S.SchemaClass<number, string | null>>()
    expect(S.compose(S.Union(S.Null, S.String), S.NumberFromString, { strict: false }))
      .type.toBe<S.SchemaClass<number, string | null>>()
    expect(S.Union(S.Null, S.String).pipe(S.compose(S.NumberFromString)))
      .type.toBe<S.SchemaClass<number, string | null>>()
    expect(S.Union(S.Null, S.String).pipe(S.compose(S.NumberFromString, { strict: false })))
      .type.toBe<S.SchemaClass<number, string | null>>()
    expect(S.compose(S.NumberFromString, S.Union(S.Null, S.Number)))
      .type.toBe<S.SchemaClass<number | null, string>>()
    expect(S.compose(S.NumberFromString, S.Union(S.Null, S.Number), { strict: false }))
      .type.toBe<S.SchemaClass<number | null, string>>()
    expect(S.NumberFromString.pipe(S.compose(S.Union(S.Null, S.Number))))
      .type.toBe<S.SchemaClass<number | null, string>>()
    expect(S.NumberFromString.pipe(S.compose(S.Union(S.Null, S.Number), { strict: false })))
      .type.toBe<S.SchemaClass<number | null, string>>()
    expect(S.compose(S.String, S.Number, { strict: false }))
      .type.toBe<S.SchemaClass<number, string>>()
    expect(S.String.pipe(S.compose(S.Number, { strict: false })))
      .type.toBe<S.SchemaClass<number, string>>()
  })

  it("FromBrand", () => {
    type Eur = number & Brand.Brand<"Eur">
    const Eur = Brand.nominal<Eur>()
    expect(S.Number.pipe(S.fromBrand(Eur)))
      .type.toBe<S.BrandSchema<number & Brand.Brand<"Eur">, number>>()
  })

  it("mutable", () => {
    expect(S.asSchema(S.mutable(S.String)))
      .type.toBe<S.Schema<string, string>>()
    S.mutable(S.String)
    expect(S.asSchema(S.mutable(S.Struct({ a: S.Number }))))
      .type.toBe<S.Schema<{ a: number }, { a: number }>>()
    S.mutable(S.Struct({ a: S.Number }))
    expect(S.asSchema(S.mutable(S.Record({ key: S.String, value: S.Number }))))
      .type.toBe<S.Schema<{ [x: string]: number }, { [x: string]: number }>>()
    S.mutable(S.Record({ key: S.String, value: S.Number }))
    expect(S.asSchema(S.mutable(S.Array(S.String))))
      .type.toBe<S.Schema<Array<string>>>()
    S.mutable(S.Array(S.String))
    expect(S.asSchema(S.mutable(S.Union(S.Struct({ a: S.Number }), S.Array(S.String)))))
      .type.toBe<S.Schema<Array<string> | { a: number }, Array<string> | { a: number }>>()
    S.mutable(S.Union(S.Struct({ a: S.Number }), S.Array(S.String)))
    expect(S.asSchema(S.mutable(S.Array(S.String).pipe(S.maxItems(2)))))
      .type.toBe<S.Schema<Array<string>>>()
    expect(S.asSchema(S.mutable(S.NonEmptyArray(S.String).pipe(S.maxItems(2)))))
      .type.toBe<S.Schema<[string, ...Array<string>], [string, ...Array<string>]>>()
    expect(S.asSchema(S.mutable(S.suspend(() => S.Array(S.String)))))
      .type.toBe<S.Schema<Array<string>>>()
    S.mutable(S.suspend(() => S.Array(S.String)))
    expect(
      S.asSchema(S.mutable(S.transform(S.Array(S.String), S.Array(S.String), { decode: identity, encode: identity })))
    )
      .type.toBe<S.Schema<Array<string>>>()
    S.mutable(S.transform(S.Array(S.String), S.Array(S.String), { decode: identity, encode: identity }))
    expect(S.asSchema(S.extend(S.mutable(S.Struct({ a: S.String })), S.mutable(S.Struct({ b: S.Number })))))
      .type.toBe<S.Schema<{ a: string } & { b: number }, { a: string } & { b: number }>>()
    expect(S.asSchema(S.extend(S.mutable(S.Struct({ a: S.String })), S.Struct({ b: S.Number }))))
      .type.toBe<S.Schema<{ a: string } & { readonly b: number }, { a: string } & { readonly b: number }>>()
    expect(
      S.asSchema(
        S.extend(S.mutable(S.Struct({ a: S.String })), S.mutable(S.Record({ key: S.String, value: S.String })))
      )
    )
      .type.toBe<S.Schema<{ a: string } & { [x: string]: string }, { a: string } & { [x: string]: string }>>()
    expect(S.asSchema(S.extend(S.mutable(S.Struct({ a: S.String })), S.Record({ key: S.String, value: S.String }))))
      .type.toBe<
      S.Schema<
        { a: string } & { readonly [x: string]: string },
        { a: string } & { readonly [x: string]: string },
        never
      >
    >()
  })

  it("transform", () => {
    const transform1 = S.String.pipe(
      S.transform(S.Number, { decode: (s) => s.length, encode: (n) => String(n) })
    )
    expect(transform1.from).type.toBe<typeof S.String>()
    expect(transform1.to).type.toBe<typeof S.Number>()
    transform1.annotations({})
    expect(S.asSchema(transform1))
      .type.toBe<S.Schema<number, string>>()
    expect(
      S.asSchema(
        S.String.pipe(S.transform(S.Number, { strict: false, decode: (s) => s, encode: (n) => n }))
      )
    ).type.toBe<S.Schema<number, string>>()
    S.String.pipe(S.transform(S.Number, { strict: false, decode: (s) => s, encode: (n) => n }))
    // @ts-expect-error
    S.String.pipe(S.transform(S.Number, (s) => s, (n) => String(n)))
    // @ts-expect-error
    S.String.pipe(S.transform(S.Number, (s) => s.length, (n) => n))

    // should receive the fromI value other than the fromA value
    S.transform(
      S.Struct({
        a: S.String,
        b: S.NumberFromString
      }),
      S.Struct({
        a: S.NumberFromString
      }),
      {
        strict: true,
        decode: ({ a, b }, i) => {
          expect(a).type.toBe<string>()
          expect(b).type.toBe<number>()
          expect(i).type.toBe<{ readonly a: string; readonly b: string }>()
          return { a: a + i.b }
        },
        encode: (i, a) => {
          expect(i).type.toBe<{ readonly a: string }>()
          expect(a).type.toBe<{ readonly a: number }>()
          return { ...i, b: a.a * 2 }
        }
      }
    )
  })

  it("transformOrFail", () => {
    const transformOrFail1 = S.String.pipe(
      S.transformOrFail(
        S.Number,
        { decode: (s) => ParseResult.succeed(s.length), encode: (n) => ParseResult.succeed(String(n)) }
      )
    )
    expect(transformOrFail1.from).type.toBe<typeof S.String>()
    expect(transformOrFail1.to).type.toBe<typeof S.Number>()
    transformOrFail1.annotations({})
    expect(S.asSchema(transformOrFail1))
      .type.toBe<S.Schema<number, string>>()
    expect(
      S.asSchema(
        S.String.pipe(
          S.transformOrFail(
            S.Number,
            { strict: false, decode: (s) => ParseResult.succeed(s), encode: (n) => ParseResult.succeed(String(n)) }
          )
        )
      )
    ).type.toBe<S.Schema<number, string>>()
    S.String.pipe(
      S.transformOrFail(
        S.Number,
        { strict: false, decode: (s) => ParseResult.succeed(s), encode: (n) => ParseResult.succeed(String(n)) }
      )
    )
    S.String.pipe(
      // @ts-expect-error
      S.transformOrFail(S.Number, (s) => ParseResult.succeed(s), (n) => ParseResult.succeed(String(n)))
    )
    S.String.pipe(
      // @ts-expect-error
      S.transformOrFail(S.Number, (s) => ParseResult.succeed(s.length), (n) => ParseResult.succeed(n))
    )

    // should receive the fromI value other than the fromA value
    S.transformOrFail(
      S.Struct({
        a: S.String,
        b: S.NumberFromString
      }),
      S.Struct({
        a: S.NumberFromString
      }),
      {
        strict: true,
        decode: ({ a, b }, _options, _ast, i) => {
          expect(a).type.toBe<string>()
          expect(b).type.toBe<number>()
          expect(i).type.toBe<{ readonly a: string; readonly b: string }>()
          return ParseResult.succeed({ a: a + i.b })
        },
        encode: (i, _options, _ast, a) => {
          expect(i).type.toBe<{ readonly a: string }>()
          expect(a).type.toBe<{ readonly a: number }>()
          return ParseResult.succeed({ ...i, b: a.a * 2 })
        }
      }
    )
  })

  it("transformLiteral", () => {
    expect(S.asSchema(S.transformLiteral(0, "a"))).type.toBe<S.Schema<"a", 0>>()
    expect(S.transformLiteral(0, "a")).type.toBe<S.transformLiteral<"a", 0>>()
  })

  it("transformLiterals", () => {
    expect(S.asSchema(S.transformLiterals([0, "a"], [1, "b"]))).type.toBe<S.Schema<"a" | "b", 0 | 1>>()
    expect(S.transformLiterals([0, "a"], [1, "b"]))
      .type.toBe<S.Union<[S.transformLiteral<"a", 0>, S.transformLiteral<"b", 1>]>>()
    expect(S.transformLiterals([0, "a"])).type.toBe<S.transformLiteral<"a", 0>>()
    const pairs = hole<Array<readonly [0 | 1, "a" | "b"]>>()
    expect(S.transformLiterals(...pairs)).type.toBe<S.Schema<"a" | "b", 0 | 1>>()
  })

  it("BigDecimal", () => {
    expect(S.asSchema(S.BigDecimal)).type.toBe<S.Schema<BigDecimal.BigDecimal, string>>()
    expect(S.asSchema(S.BigDecimalFromSelf)).type.toBe<S.Schema<BigDecimal.BigDecimal>>()
    expect(S.asSchema(S.BigDecimalFromNumber)).type.toBe<S.Schema<BigDecimal.BigDecimal, number>>()
  })

  it("Duration", () => {
    expect(S.asSchema(S.Duration))
      .type.toBe<S.Schema<Duration.Duration, S.DurationEncoded | readonly [seconds: number, nanos: number]>>()
  })

  it("DurationFromSelf", () => {
    expect(S.asSchema(S.DurationFromSelf)).type.toBe<S.Schema<Duration.Duration>>()
  })

  it("DurationFromMillis", () => {
    expect(S.asSchema(S.DurationFromMillis)).type.toBe<S.Schema<Duration.Duration, number>>()
  })

  it("DurationFromNanos", () => {
    expect(S.asSchema(S.DurationFromNanos)).type.toBe<S.Schema<Duration.Duration, bigint>>()
  })

  it("Redacted", () => {
    expect(S.asSchema(S.Redacted(S.NumberFromString))).type.toBe<S.Schema<Redacted.Redacted<number>, string>>()
    expect(S.Redacted(S.NumberFromString)).type.toBe<S.Redacted<typeof S.NumberFromString>>()
    expect(S.asSchema(S.RedactedFromSelf(S.NumberFromString)))
      .type.toBe<S.Schema<Redacted.Redacted<number>, Redacted.Redacted<string>>>()
    expect(S.RedactedFromSelf(S.NumberFromString)).type.toBe<S.RedactedFromSelf<typeof S.NumberFromString>>()
  })

  it("propertySignature", () => {
    expect(S.propertySignature(S.String)).type.toBe<S.propertySignature<typeof S.String>>()
    expect(S.propertySignature(S.String).annotations({})).type.toBe<S.propertySignature<typeof S.String>>()
  })

  it("PropertySignature.annotations", () => {
    expect(S.optional(S.String).annotations({})).type.toBe<S.optional<typeof S.String>>()
  })

  it("pluck", () => {
    // @ts-expect-error
    S.pluck(S.Struct({ a: S.propertySignature(S.Number).pipe(S.fromKey("c")) }), "a")
    expect(S.pluck(S.Struct({ a: S.String, b: S.Number }), "a"))
      .type.toBe<S.Schema<string, { readonly a: string }>>()
    expect(pipe(S.Struct({ a: S.String, b: S.Number }), S.pluck("a")))
      .type.toBe<S.Schema<string, { readonly a: string }>>()
    expect(S.pluck(S.Struct({ a: S.optional(S.String), b: S.Number }), "a"))
      .type.toBe<S.Schema<string | undefined, { readonly a?: string | undefined }>>()
    expect(pipe(S.Struct({ a: S.optional(S.String), b: S.Number }), S.pluck("a")))
      .type.toBe<S.Schema<string | undefined, { readonly a?: string | undefined }>>()
    expect(S.pluck(S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.Number }), "a"))
      .type.toBe<S.Schema<string | undefined, { readonly a?: string }>>()
    expect(pipe(S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.Number }), S.pluck("a")))
      .type.toBe<S.Schema<string | undefined, { readonly a?: string }>>()
  })

  it("Head", () => {
    expect(S.head(S.Array(S.Number))).type.toBe<S.SchemaClass<Option.Option<number>, ReadonlyArray<number>>>()
  })

  it("HeadOrElse", () => {
    expect(S.headOrElse(S.Array(S.Number))).type.toBe<S.SchemaClass<number, ReadonlyArray<number>>>()
  })

  it("TaggedClass", () => {
    class MyTaggedClass extends S.TaggedClass<MyTaggedClass>()("MyTaggedClass", {
      a: S.String
    }) {}
    expect(hole<ConstructorParameters<typeof MyTaggedClass>>()).type.toBe<
      [props: { readonly a: string }, options?: S.MakeOptions | undefined]
    >()
    expect(hole<S.Schema.Encoded<typeof MyTaggedClass>>()).type.toBe<
      { readonly a: string; readonly _tag: "MyTaggedClass" }
    >()
    expect(hole<S.Schema.Type<typeof MyTaggedClass>>()).type.toBe<MyTaggedClass>()
    class VoidTaggedClass extends S.TaggedClass<VoidTaggedClass>()("VoidTaggedClass", {}) {}
    expect(hole<ConstructorParameters<typeof VoidTaggedClass>>()).type.toBe<
      [props?: void | {}, options?: S.MakeOptions | undefined]
    >()
    expect(S.asSchema(S.Struct(MyTaggedClass.fields)))
      .type.toBe<
      S.Schema<
        { readonly a: string; readonly _tag: "MyTaggedClass" },
        { readonly a: string; readonly _tag: "MyTaggedClass" },
        never
      >
    >()
    expect(hole<Parameters<S.Struct<typeof MyTaggedClass.fields>["make"]>>()).type.toBe<
      [props: { readonly a: string; readonly _tag?: "MyTaggedClass" }, options?: S.MakeOptions | undefined]
    >()
  })

  it("TaggedError", () => {
    class MyTaggedError extends S.TaggedError<MyTaggedError>()("MyTaggedError", {
      a: S.String
    }) {}
    expect(S.asSchema(S.Struct(MyTaggedError.fields)))
      .type.toBe<
      S.Schema<
        { readonly a: string; readonly _tag: "MyTaggedError" },
        { readonly a: string; readonly _tag: "MyTaggedError" },
        never
      >
    >()
    expect(hole<Parameters<S.Struct<typeof MyTaggedError.fields>["make"]>>()).type.toBe<
      [props: { readonly a: string; readonly _tag?: "MyTaggedError" }, options?: S.MakeOptions | undefined]
    >()
  })

  it("TaggedRequest", () => {
    class MyTaggedRequest extends S.TaggedRequest<MyTaggedRequest>()("MyTaggedRequest", {
      failure: S.String,
      success: S.Number,
      payload: { a: S.String }
    }) {}
    expect(S.asSchema(S.Struct(MyTaggedRequest.fields)))
      .type.toBe<
      S.Schema<
        { readonly a: string; readonly _tag: "MyTaggedRequest" },
        { readonly a: string; readonly _tag: "MyTaggedRequest" },
        never
      >
    >()
    expect(hole<Parameters<S.Struct<typeof MyTaggedRequest.fields>["make"]>>()).type.toBe<
      [props: { readonly a: string; readonly _tag?: "MyTaggedRequest" }, options?: S.MakeOptions | undefined]
    >()
  })

  it("Struct.Type", () => {
    const _StructTypeTest1 = <S extends S.Schema.Any>(input: S.Struct.Type<{ s: S }>) => {
      expect(input).type.toBe<S.Struct.Type<{ s: S }>>()
      input
    }
    expect(hole<Types.Simplify<S.Struct.Type<{}>>>()).type.toBe<{}>()
    expect(hole<Types.Simplify<S.Struct.Type<{ a: S.Schema<number, string> }>>>()).type.toBe<{ readonly a: number }>()
    expect(hole<
      Types.Simplify<
        S.Struct.Type<{
          a: S.Schema<number, string>
          b: S.PropertySignature<":", number, never, ":", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: number; readonly b: number }>()
    expect(hole<
      Types.Simplify<
        S.Struct.Type<{
          a: S.Schema<number, string>
          b: S.PropertySignature<":", number, never, "?:", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: number; readonly b: number }>()
    expect(hole<
      Types.Simplify<
        S.Struct.Type<{
          a: S.Schema<number, string>
          b: S.PropertySignature<":", number, "c", ":", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: number; readonly b: number }>()
    expect(hole<
      Types.Simplify<
        S.Struct.Type<{
          a: S.Schema<number, string>
          b: S.PropertySignature<":", number, "c", "?:", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: number; readonly b: number }>()
    expect(hole<
      Types.Simplify<
        S.Struct.Type<{
          a: S.Schema<number, string>
          b: S.PropertySignature<"?:", number, never, ":", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: number; readonly b?: number }>()
    expect(hole<
      Types.Simplify<
        S.Struct.Type<{
          a: S.Schema<number, string>
          b: S.PropertySignature<"?:", number, never, "?:", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: number; readonly b?: number }>()
    expect(hole<
      Types.Simplify<
        S.Struct.Type<{
          a: S.Schema<number, string>
          b: S.PropertySignature<"?:", number, "c", ":", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: number; readonly b?: number }>()
    expect(hole<
      Types.Simplify<
        S.Struct.Type<{
          a: S.Schema<number, string>
          b: S.PropertySignature<"?:", number, "c", "?:", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: number; readonly b?: number }>()
  })

  it("Struct.Encoded", () => {
    expect(hole<Types.Simplify<S.Struct.Encoded<{}>>>()).type.toBe<{}>()
    expect(hole<Types.Simplify<S.Struct.Encoded<{ a: S.Schema<number, string> }>>>()).type.toBe<
      { readonly a: string }
    >()
    expect(hole<
      Types.Simplify<
        S.Struct.Encoded<{
          a: S.Schema<number, string>
          b: S.PropertySignature<":", number, never, ":", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: string; readonly b: string }>()
    expect(hole<
      Types.Simplify<
        S.Struct.Encoded<{
          a: S.Schema<number, string>
          b: S.PropertySignature<":", number, never, "?:", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: string; readonly b?: string }>()
    expect(hole<
      Types.Simplify<
        S.Struct.Encoded<{
          a: S.Schema<number, string>
          b: S.PropertySignature<":", number, "c", ":", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: string; readonly c: string }>()
    expect(hole<
      Types.Simplify<
        S.Struct.Encoded<{
          a: S.Schema<number, string>
          b: S.PropertySignature<":", number, "c", "?:", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: string; readonly c?: string }>()
    expect(hole<
      Types.Simplify<
        S.Struct.Encoded<{
          a: S.Schema<number, string>
          b: S.PropertySignature<"?:", number, never, ":", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: string; readonly b: string }>()
    expect(hole<
      Types.Simplify<
        S.Struct.Encoded<{
          a: S.Schema<number, string>
          b: S.PropertySignature<"?:", number, never, "?:", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: string; readonly b?: string }>()
    expect(hole<
      Types.Simplify<
        S.Struct.Encoded<{
          a: S.Schema<number, string>
          b: S.PropertySignature<"?:", number, "c", ":", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: string; readonly c: string }>()
    expect(hole<
      Types.Simplify<
        S.Struct.Encoded<{
          a: S.Schema<number, string>
          b: S.PropertySignature<"?:", number, "c", "?:", string, false, "context">
        }>
      >
    >()).type.toBe<{ readonly a: string; readonly c?: string }>()
  })

  it("OptionFromSelf", () => {
    expect(S.asSchema(S.OptionFromSelf(S.Number)))
      .type.toBe<S.Schema<Option.Option<number>, Option.Option<number>>>()
    expect(S.OptionFromSelf(S.Number)).type.toBe<S.OptionFromSelf<typeof S.Number>>()
    expect(S.asSchema(S.OptionFromSelf(S.NumberFromString)))
      .type.toBe<S.Schema<Option.Option<number>, Option.Option<string>>>()
    expect(S.OptionFromSelf(S.NumberFromString)).type.toBe<S.OptionFromSelf<typeof S.NumberFromString>>()
  })

  it("Option", () => {
    expect(S.asSchema(S.Option(S.Number)))
      .type.toBe<S.Schema<Option.Option<number>, S.OptionEncoded<number>>>()
    expect(S.Option(S.Number)).type.toBe<S.Option<typeof S.Number>>()
    expect(S.asSchema(S.Option(S.NumberFromString)))
      .type.toBe<S.Schema<Option.Option<number>, S.OptionEncoded<string>>>()
    expect(S.Option(S.NumberFromString)).type.toBe<S.Option<typeof S.NumberFromString>>()
  })

  it("OptionFromNullOr", () => {
    expect(S.asSchema(S.OptionFromNullOr(S.Number)))
      .type.toBe<S.Schema<Option.Option<number>, number | null>>()
    expect(S.OptionFromNullOr(S.Number)).type.toBe<S.OptionFromNullOr<typeof S.Number>>()
    expect(S.asSchema(S.OptionFromNullOr(S.NumberFromString)))
      .type.toBe<S.Schema<Option.Option<number>, string | null>>()
    expect(S.OptionFromNullOr(S.NumberFromString)).type.toBe<S.OptionFromNullOr<typeof S.NumberFromString>>()
  })

  it("OptionFromUndefinedOr", () => {
    expect(S.asSchema(S.OptionFromUndefinedOr(S.NumberFromString)))
      .type.toBe<S.Schema<Option.Option<number>, string | undefined>>()
    expect(S.OptionFromUndefinedOr(S.NumberFromString)).type.toBe<S.OptionFromUndefinedOr<typeof S.NumberFromString>>()
  })

  it("OptionFromNullishOr", () => {
    expect(S.asSchema(S.OptionFromNullishOr(S.NumberFromString, null)))
      .type.toBe<S.Schema<Option.Option<number>, string | null | undefined>>()
    expect(S.OptionFromNullishOr(S.NumberFromString, undefined)).type.toBe<
      S.OptionFromNullishOr<typeof S.NumberFromString>
    >()
  })

  it("EitherFromSelf", () => {
    expect(
      S.asSchema(S.EitherFromSelf({ right: S.NumberFromString, left: S.String }))
    ).type.toBe<S.Schema<Either.Either<number, string>, Either.Either<string, string>>>()
    expect(S.EitherFromSelf({ right: S.NumberFromString, left: S.String })).type.toBe<
      S.EitherFromSelf<typeof S.NumberFromString, typeof S.String>
    >()
    expect(S.EitherFromSelf({ right: S.String, left: S.Never })).type.toBe<
      S.EitherFromSelf<typeof S.String, typeof S.Never>
    >()
    expect(S.EitherFromSelf({ right: S.Never, left: S.String })).type.toBe<
      S.EitherFromSelf<typeof S.Never, typeof S.String>
    >()
  })

  it("Either", () => {
    expect(S.asSchema(S.Either({ right: S.NumberFromString, left: S.String })))
      .type.toBe<S.Schema<Either.Either<number, string>, S.EitherEncoded<string, string>>>()
    expect(S.Either({ right: S.NumberFromString, left: S.String })).type.toBe<
      S.Either<typeof S.NumberFromString, typeof S.String>
    >()
    expect(S.Either({ right: S.String, left: S.Never })).type.toBe<S.Either<typeof S.String, typeof S.Never>>()
    expect(S.Either({ right: S.Never, left: S.String })).type.toBe<S.Either<typeof S.Never, typeof S.String>>()
  })

  it("EitherFromUnion", () => {
    expect(
      S.asSchema(S.EitherFromUnion({ right: S.NumberFromString, left: S.Boolean }))
    ).type.toBe<S.Schema<Either.Either<number, boolean>, string | boolean>>()
    expect(S.EitherFromUnion({ right: S.NumberFromString, left: S.Boolean })).type.toBe<
      S.EitherFromUnion<typeof S.NumberFromString, typeof S.Boolean>
    >()
    expect(S.EitherFromUnion({ right: S.String, left: S.Never })).type.toBe<
      S.EitherFromUnion<typeof S.String, typeof S.Never>
    >()
    expect(S.EitherFromUnion({ right: S.Never, left: S.String })).type.toBe<
      S.EitherFromUnion<typeof S.Never, typeof S.String>
    >()
  })

  it("ReadonlyMapFromSelf", () => {
    expect(
      S.asSchema(S.ReadonlyMapFromSelf({ key: S.NumberFromString, value: S.String }))
    ).type.toBe<S.Schema<ReadonlyMap<number, string>, ReadonlyMap<string, string>>>()
    expect(S.ReadonlyMapFromSelf({ key: S.NumberFromString, value: S.String })).type.toBe<
      S.ReadonlyMapFromSelf<typeof S.NumberFromString, typeof S.String>
    >()
  })

  it("MapFromSelf", () => {
    expect(
      S.asSchema(S.MapFromSelf({ key: S.NumberFromString, value: S.String }))
    ).type.toBe<S.Schema<Map<number, string>, ReadonlyMap<string, string>>>()
    expect(S.MapFromSelf({ key: S.NumberFromString, value: S.String })).type.toBe<
      S.MapFromSelf<typeof S.NumberFromString, typeof S.String>
    >()
  })

  it("ReadonlyMap", () => {
    expect(
      S.asSchema(S.ReadonlyMap({ key: S.NumberFromString, value: S.String }))
    ).type.toBe<
      S.Schema<ReadonlyMap<number, string>, ReadonlyArray<readonly [string, string]>>
    >()
    expect(S.ReadonlyMap({ key: S.NumberFromString, value: S.String }))
      .type.toBe<S.ReadonlyMap$<typeof S.NumberFromString, typeof S.String>>()
  })

  it("Map", () => {
    expect(
      S.asSchema(S.Map({ key: S.NumberFromString, value: S.String }))
    ).type.toBe<
      S.Schema<Map<number, string>, ReadonlyArray<readonly [string, string]>>
    >()
    expect(S.Map({ key: S.NumberFromString, value: S.String }))
      .type.toBe<S.Map$<typeof S.NumberFromString, typeof S.String>>()
  })

  it("HashMapFromSelf", () => {
    expect(
      S.asSchema(S.HashMapFromSelf({ key: S.NumberFromString, value: S.String }))
    ).type.toBe<S.Schema<HashMap.HashMap<number, string>, HashMap.HashMap<string, string>>>()
    expect(S.HashMapFromSelf({ key: S.NumberFromString, value: S.String })).type.toBe<
      S.HashMapFromSelf<typeof S.NumberFromString, typeof S.String>
    >()
  })

  it("HashMap", () => {
    expect(
      S.asSchema(S.HashMap({ key: S.NumberFromString, value: S.String }))
    ).type.toBe<
      S.Schema<HashMap.HashMap<number, string>, ReadonlyArray<readonly [string, string]>>
    >()
    expect(S.HashMap({ key: S.NumberFromString, value: S.String }))
      .type.toBe<S.HashMap<typeof S.NumberFromString, typeof S.String>>()
  })

  it("ReadonlySetFromSelf", () => {
    expect(S.asSchema(S.ReadonlySetFromSelf(S.NumberFromString)))
      .type.toBe<S.Schema<ReadonlySet<number>, ReadonlySet<string>>>()
    expect(S.ReadonlySetFromSelf(S.NumberFromString)).type.toBe<S.ReadonlySetFromSelf<typeof S.NumberFromString>>()
  })

  it("SetFromSelf", () => {
    expect(S.asSchema(S.SetFromSelf(S.NumberFromString)))
      .type.toBe<S.Schema<Set<number>, ReadonlySet<string>>>()
    expect(S.SetFromSelf(S.NumberFromString)).type.toBe<S.SetFromSelf<typeof S.NumberFromString>>()
  })

  it("ReadonlySet", () => {
    expect(S.asSchema(S.ReadonlySet(S.NumberFromString)))
      .type.toBe<S.Schema<ReadonlySet<number>, ReadonlyArray<string>>>()
    expect(S.ReadonlySet(S.NumberFromString))
      .type.toBe<S.ReadonlySet$<typeof S.NumberFromString>>()
  })

  it("Set", () => {
    expect(S.asSchema(S.Set(S.NumberFromString)))
      .type.toBe<S.Schema<Set<number>, ReadonlyArray<string>>>()
    expect(S.Set(S.NumberFromString))
      .type.toBe<S.Set$<typeof S.NumberFromString>>()
  })

  it("HashSetFromSelf", () => {
    expect(S.asSchema(S.HashSetFromSelf(S.NumberFromString)))
      .type.toBe<S.Schema<HashSet.HashSet<number>, HashSet.HashSet<string>>>()
    expect(S.HashSetFromSelf(S.NumberFromString)).type.toBe<S.HashSetFromSelf<typeof S.NumberFromString>>()
  })

  it("HashSet", () => {
    expect(S.asSchema(S.HashSet(S.NumberFromString)))
      .type.toBe<S.Schema<HashSet.HashSet<number>, ReadonlyArray<string>>>()
    expect(S.HashSet(S.NumberFromString))
      .type.toBe<S.HashSet<typeof S.NumberFromString>>()
  })

  it("ChunkFromSelf", () => {
    expect(S.asSchema(S.ChunkFromSelf(S.NumberFromString)))
      .type.toBe<S.Schema<Chunk.Chunk<number>, Chunk.Chunk<string>>>()
    expect(S.ChunkFromSelf(S.NumberFromString)).type.toBe<S.ChunkFromSelf<typeof S.NumberFromString>>()
  })

  it("Chunk", () => {
    expect(S.asSchema(S.Chunk(S.NumberFromString)))
      .type.toBe<S.Schema<Chunk.Chunk<number>, ReadonlyArray<string>>>()
    expect(S.Chunk(S.NumberFromString))
      .type.toBe<S.Chunk<typeof S.NumberFromString>>()
  })

  it("NonEmptyChunkFromSelf", () => {
    expect(S.asSchema(S.NonEmptyChunkFromSelf(S.NumberFromString)))
      .type.toBe<S.Schema<Chunk.NonEmptyChunk<number>, Chunk.NonEmptyChunk<string>>>()
    expect(S.NonEmptyChunkFromSelf(S.NumberFromString)).type.toBe<S.NonEmptyChunkFromSelf<typeof S.NumberFromString>>()
  })

  it("NonEmptyChunk", () => {
    expect(S.asSchema(S.NonEmptyChunk(S.NumberFromString)))
      .type.toBe<S.Schema<Chunk.NonEmptyChunk<number>, readonly [string, ...Array<string>]>>()
    expect(S.NonEmptyChunk(S.NumberFromString))
      .type.toBe<S.NonEmptyChunk<typeof S.NumberFromString>>()
  })

  it("ListFromSelf", () => {
    expect(S.asSchema(S.ListFromSelf(S.NumberFromString)))
      .type.toBe<S.Schema<List.List<number>, List.List<string>>>()
    expect(S.ListFromSelf(S.NumberFromString)).type.toBe<S.ListFromSelf<typeof S.NumberFromString>>()
  })

  it("List", () => {
    expect(S.asSchema(S.List(S.NumberFromString)))
      .type.toBe<S.Schema<List.List<number>, ReadonlyArray<string>>>()
    expect(S.List(S.NumberFromString))
      .type.toBe<S.List<typeof S.NumberFromString>>()
  })

  it("ExitFromSelf", () => {
    expect(
      S.asSchema(S.ExitFromSelf({ success: S.Number, failure: S.String, defect: S.Unknown }))
    ).type.toBe<S.Schema<Exit.Exit<number, string>, Exit.Exit<number, string>>>()
    expect(S.ExitFromSelf({ success: S.Number, failure: S.String, defect: S.Unknown })).type.toBe<
      S.ExitFromSelf<typeof S.Number, typeof S.String, typeof S.Unknown>
    >()
    expect(
      S.asSchema(
        S.ExitFromSelf({ success: S.Number, failure: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() })
      )
    ).type.toBe<S.Schema<Exit.Exit<number, string>, Exit.Exit<number, string>, "a">>()
    expect(
      S.ExitFromSelf({ success: S.Number, failure: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() })
    ).type.toBe<S.ExitFromSelf<typeof S.Number, typeof S.String, S.Schema<unknown, unknown, "a">>>()
    expect(
      S.asSchema(
        S.Struct({
          a: S.ExitFromSelf({
            success: S.Number,
            failure: S.String,
            defect: S.Unknown
          })
        })
      )
    ).type.toBe<
      S.Schema<{ readonly a: Exit.Exit<number, string> }, { readonly a: Exit.Exit<number, string> }>
    >()
  })

  it("Exit", () => {
    expect(S.asSchema(S.Exit({ success: S.Number, failure: S.String, defect: S.Defect })))
      .type.toBe<S.Schema<Exit.Exit<number, string>, S.ExitEncoded<number, string, unknown>>>()
    expect(S.Exit({ success: S.Number, failure: S.String, defect: S.Defect })).type.toBe<
      S.Exit<typeof S.Number, typeof S.String, S.Defect>
    >()
    expect(
      S.asSchema(
        S.Exit({ success: S.Number, failure: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() })
      )
    ).type.toBe<S.Schema<Exit.Exit<number, string>, S.ExitEncoded<number, string, unknown>, "a">>()
    expect(
      S.Exit({ success: S.Number, failure: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() })
    ).type.toBe<S.Exit<typeof S.Number, typeof S.String, S.Schema<unknown, unknown, "a">>>()
    expect(
      S.asSchema(
        S.Struct({
          a: S.Exit({ success: S.Number, failure: S.String, defect: S.Defect })
        })
      )
    ).type.toBe<
      S.Schema<{ readonly a: Exit.Exit<number, string> }, { readonly a: S.ExitEncoded<number, string, unknown> }>
    >()
  })

  it("CauseFromSelf", () => {
    expect(S.asSchema(S.CauseFromSelf({ error: S.String, defect: S.Unknown })))
      .type.toBe<S.Schema<Cause.Cause<string>, Cause.Cause<string>>>()
    expect(S.CauseFromSelf({ error: S.String, defect: S.Unknown })).type.toBe<
      S.CauseFromSelf<typeof S.String, typeof S.Unknown>
    >()
    expect(
      S.asSchema(S.CauseFromSelf({ error: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() }))
    ).type.toBe<S.Schema<Cause.Cause<string>, Cause.Cause<string>, "a">>()
    expect(S.CauseFromSelf({ error: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() })).type.toBe<
      S.CauseFromSelf<typeof S.String, S.Schema<unknown, unknown, "a">>
    >()
    expect(
      S.asSchema(
        S.Struct({ a: S.CauseFromSelf({ error: S.String, defect: S.Unknown }) })
      )
    ).type.toBe<S.Schema<{ readonly a: Cause.Cause<string> }, { readonly a: Cause.Cause<string> }>>()
  })

  it("Cause", () => {
    expect(S.asSchema(S.Cause({ error: S.String, defect: S.Defect })))
      .type.toBe<S.Schema<Cause.Cause<string>, S.CauseEncoded<string, unknown>>>()
    expect(S.Cause({ error: S.String, defect: S.Defect })).type.toBe<S.Cause<typeof S.String, S.Defect>>()
    expect(
      S.asSchema(S.Cause({ error: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() }))
    ).type.toBe<S.Schema<Cause.Cause<string>, S.CauseEncoded<string, unknown>, "a">>()
    expect(S.Cause({ error: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() })).type.toBe<
      S.Cause<typeof S.String, S.Schema<unknown, unknown, "a">>
    >()
    expect(
      S.asSchema(
        S.Struct({ a: S.Cause({ error: S.String, defect: S.Defect }) })
      )
    ).type.toBe<
      S.Schema<{ readonly a: Cause.Cause<string> }, { readonly a: S.CauseEncoded<string, unknown> }>
    >()
  })

  it("TypeLiteral", () => {
    expect(S.asSchema(hole<S.TypeLiteral<{ a: typeof S.String }, []>>()))
      .type.toBe<S.Schema<{ readonly a: string }, { readonly a: string }>>()
    expect(S.asSchema(hole<S.TypeLiteral<{}, [{ key: typeof S.String; value: typeof S.Unknown }]>>()))
      .type.toBe<S.Schema<{ readonly [x: string]: unknown }, { readonly [x: string]: unknown }>>()
    expect(
      S.asSchema(
        hole<
          S.TypeLiteral<
            {},
            [{ key: typeof S.String; value: typeof S.String }, { key: typeof S.Symbol; value: typeof S.Number }]
          >
        >()
      )
    ).type.toBe<
      S.Schema<
        { readonly [x: string]: string; readonly [x: symbol]: number },
        { readonly [x: string]: never },
        never
      >
    >()
    expect(
      S.asSchema(hole<S.TypeLiteral<{ a: typeof S.String }, [{ key: typeof S.String; value: typeof S.Unknown }]>>())
    )
      .type.toBe<
      S.Schema<
        { readonly [x: string]: unknown; readonly a: string },
        { readonly [x: string]: unknown; readonly a: string },
        never
      >
    >()
  })

  it("TupleType.Type", () => {
    expect(hole<S.TupleType.Type<[], []>>()).type.toBe<readonly []>()
    expect(hole<S.TupleType.Type<[typeof S.NumberFromString], []>>()).type.toBe<readonly [number]>()
    expect(hole<S.TupleType.Type<[], [typeof S.NumberFromString]>>()).type.toBe<ReadonlyArray<number>>()
    expect(hole<S.TupleType.Type<[typeof S.NumberFromString], [typeof S.NumberFromString]>>()).type.toBe<
      readonly [number, ...Array<number>]
    >()
    expect(
      hole<S.TupleType.Type<[typeof S.NumberFromString], [typeof S.NumberFromString, typeof S.NumberFromString]>>()
    ).type.toBe<readonly [number, ...Array<number>, number]>()
    expect(
      hole<S.TupleType.Type<[typeof S.NumberFromString, S.Element<typeof S.NumberFromString, "?">], []>>()
    ).type.toBe<readonly [number, number?]>()
    expect(
      hole<
        S.TupleType.Type<
          [typeof S.NumberFromString, S.Element<typeof S.NumberFromString, "?">],
          [typeof S.NumberFromString]
        >
      >()
    ).type.toBe<readonly [number, number?, ...Array<number>]>()
  })

  it("TupleType.Encoded", () => {
    expect(hole<S.TupleType.Encoded<[], []>>()).type.toBe<readonly []>()
    expect(hole<S.TupleType.Encoded<[typeof S.NumberFromString], []>>()).type.toBe<readonly [string]>()
    expect(hole<S.TupleType.Encoded<[], [typeof S.NumberFromString]>>()).type.toBe<ReadonlyArray<string>>()
    expect(hole<S.TupleType.Encoded<[typeof S.NumberFromString], [typeof S.NumberFromString]>>()).type.toBe<
      readonly [string, ...Array<string>]
    >()
    expect(
      hole<S.TupleType.Encoded<[typeof S.NumberFromString], [typeof S.NumberFromString, typeof S.NumberFromString]>>()
    ).type.toBe<readonly [string, ...Array<string>, string]>()
    expect(
      hole<S.TupleType.Encoded<[typeof S.NumberFromString, S.Element<typeof S.NumberFromString, "?">], []>>()
    ).type.toBe<readonly [string, string?]>()
    expect(
      hole<
        S.TupleType.Encoded<
          [typeof S.NumberFromString, S.Element<typeof S.NumberFromString, "?">],
          [typeof S.NumberFromString]
        >
      >()
    ).type.toBe<readonly [string, string?, ...Array<string>]>()
  })

  it("TupleType.Context", () => {
    expect(
      hole<S.Schema.Context<S.TupleType<[typeof aContext], [typeof bContext, typeof cContext]>>>()
    ).type.toBe<"a" | "b" | "c">()
  })

  it("SortedSetFromSelf", () => {
    expect(
      S.asSchema(S.SortedSetFromSelf(S.NumberFromString, N.Order, Str.Order))
    ).type.toBe<S.Schema<SortedSet.SortedSet<number>, SortedSet.SortedSet<string>>>()
    expect(S.SortedSetFromSelf(S.NumberFromString, N.Order, Str.Order))
      .type.toBe<S.SortedSetFromSelf<typeof S.NumberFromString>>()
  })

  it("SortedSet", () => {
    expect(S.asSchema(S.SortedSet(S.NumberFromString, N.Order)))
      .type.toBe<S.Schema<SortedSet.SortedSet<number>, ReadonlyArray<string>>>()
    expect(S.SortedSet(S.NumberFromString, N.Order))
      .type.toBe<S.SortedSet<typeof S.NumberFromString>>()
  })

  it("Struct.Constructor", () => {
    expect(
      hole<
        S.Struct.Constructor<{
          a: S.PropertySignature<":", string, never, ":", string, true>
          b: typeof S.Number
          c: S.PropertySignature<":", boolean, never, ":", boolean, true>
        }>
      >()
    ).type.toBe<{ readonly a?: string } & { readonly b: number } & { readonly c?: boolean }>()
  })

  it("withConstructorDefault", () => {
    // @ts-expect-error
    S.propertySignature(S.String).pipe(S.withConstructorDefault(() => 1))
    expect(S.propertySignature(S.String).pipe(S.withConstructorDefault(() => "a")))
      .type.toBe<S.PropertySignature<":", string, never, ":", string, true>>()
    expect(S.withConstructorDefault(S.propertySignature(S.String), () => "a"))
      .type.toBe<S.PropertySignature<":", string, never, ":", string, true>>()
  })

  it("Struct.make", () => {
    const make1 = S.Struct({
      a: S.propertySignature(S.String).pipe(S.withConstructorDefault(() => "")),
      b: S.Number,
      c: S.propertySignature(S.Boolean).pipe(S.withConstructorDefault(() => true))
    }).make
    expect(hole<Parameters<typeof make1>[0]>()).type.toBe<
      { readonly a?: string; readonly b: number; readonly c?: boolean }
    >()
    const make2 = S.Struct({
      a: S.withConstructorDefault(S.propertySignature(S.String), () => ""),
      b: S.Number,
      c: S.withConstructorDefault(S.propertySignature(S.Boolean), () => true)
    }).make
    expect(hole<Parameters<typeof make2>[0]>()).type.toBe<
      { readonly a?: string; readonly b: number; readonly c?: boolean }
    >()
    const make3 = S.Struct({
      a: S.withConstructorDefault(S.propertySignature(S.String), () => "")
    }).make
    expect(hole<Parameters<typeof make3>[0]>()).type.toBe<void | { readonly a?: string } | undefined>()
    class AA extends S.Class<AA>("AA")({
      a: S.propertySignature(S.String).pipe(S.withConstructorDefault(() => "")),
      b: S.Number,
      c: S.propertySignature(S.Boolean).pipe(S.withConstructorDefault(() => true))
    }) {}
    expect(hole<ConstructorParameters<typeof AA>>()).type.toBe<
      [props: { readonly a?: string; readonly b: number; readonly c?: boolean }, options?: S.MakeOptions | undefined]
    >()
  })

  it("withDecodingDefault", () => {
    S.Struct({
      a: S.optional(S.String).pipe(
        S.withConstructorDefault(() => undefined),
        // @ts-expect-error
        S.withDecodingDefault(() => "")
      )
    })
    S.Struct({
      a: S.optional(S.String).pipe(
        // @ts-expect-error
        S.withDecodingDefault(() => undefined)
      )
    })
    expect(
      S.asSchema(S.Struct({ a: S.optional(S.String).pipe(S.withDecodingDefault(() => "")) }))
    ).type.toBe<
      S.Schema<{ readonly a: string }, { readonly a?: string | undefined }>
    >()
    expect(S.Struct({ a: S.optional(S.String).pipe(S.withDecodingDefault(() => "")) }))
      .type.toBe<S.Struct<{ a: S.PropertySignature<":", string, never, "?:", string | undefined, false> }>>()
  })

  it("withDefaults", () => {
    S.Struct({
      a: S.optional(S.String).pipe(
        S.withDefaults({
          // @ts-expect-error
          decoding: () => undefined,
          // @ts-expect-error
          constructor: () => undefined
        })
      )
    })
    expect(
      S.asSchema(
        S.Struct({ a: S.optional(S.String).pipe(S.withDefaults({ decoding: () => "", constructor: () => "" })) })
      )
    ).type.toBe<
      S.Schema<{ readonly a: string }, { readonly a?: string | undefined }>
    >()
    expect(
      S.Struct({ a: S.optional(S.String).pipe(S.withDefaults({ decoding: () => "", constructor: () => "" })) })
    ).type.toBe<S.Struct<{ a: S.PropertySignature<":", string, never, "?:", string | undefined, true> }>>()
    const make4 =
      S.Struct({ a: S.optional(S.String).pipe(S.withDefaults({ decoding: () => "", constructor: () => "" })) }).make
    expect(hole<Parameters<typeof make4>[0]>()).type.toBe<void | { readonly a?: string } | undefined>()
  })

  it("Schema.AsSchema", () => {
    const MyStruct = <X extends S.Schema.All>(x: X) => S.Struct({ x })
    type MyStructReturnType<X extends S.Schema.All> = S.Schema.Type<ReturnType<typeof MyStruct<X>>>
    function _AsSchemaTest1<X extends S.Schema.All>(obj: MyStructReturnType<S.Schema.AsSchema<X>>) {
      expect(obj.x).type.toBe<S.Schema.Type<X>>()
    }
    type XStruct<X extends S.Schema.All> = S.Schema<
      S.Struct.Type<{
        expectedVersion: typeof S.Number
        props: X
      }>,
      S.Struct.Encoded<{
        expectedVersion: typeof S.Number
        props: X
      }>
    >
    const _AsSchemaTest2 = <X extends S.Schema.All>(
      domainEvent: S.Schema.Type<XStruct<S.Schema.AsSchema<X>>>
    ) => {
      expect(domainEvent.expectedVersion).type.toBe<number>()
      expect(domainEvent.props).type.toBe<S.Schema.Type<X>>()
    }
  })

  it("Schema.is", () => {
    expect(hole<Array<string | number>>().filter(S.is(S.String)))
      .type.toBe<Array<string>>()
    expect(hole<Array<string | number>>().find(S.is(S.String)))
      .type.toBe<string | undefined>()
  })

  it("TaggedStruct", () => {
    expect(S.tag("A")).type.toBe<S.tag<"A">>()
    const MyTaggedStruct = S.TaggedStruct("Product", {
      category: S.tag("Electronics"),
      name: S.String,
      price: S.Number
    })
    expect(S.asSchema(MyTaggedStruct))
      .type.toBe<
      S.Schema<
        { readonly _tag: "Product"; readonly name: string; readonly category: "Electronics"; readonly price: number },
        { readonly _tag: "Product"; readonly name: string; readonly category: "Electronics"; readonly price: number },
        never
      >
    >()
    expect(hole<Parameters<typeof MyTaggedStruct["make"]>>()).type.toBe<
      [
        props: {
          readonly _tag?: "Product"
          readonly name: string
          readonly category?: "Electronics"
          readonly price: number
        },
        options?: S.MakeOptions | undefined
      ]
    >()
  })

  it("optionalToOptional", () => {
    expect(
      S.asSchema(S.Struct({ a: S.optionalToOptional(aContext, S.String, { decode: (o) => o, encode: (o) => o }) }))
    ).type.toBe<S.Schema<{ readonly a?: string }, { readonly a?: string }, "a">>()
    expect(
      S.Struct({ a: S.optionalToOptional(aContext, S.String, { decode: (o) => o, encode: (o) => o }) })
    ).type.toBe<S.Struct<{ a: S.PropertySignature<"?:", string, never, "?:", string, false, "a"> }>>()
  })

  it("optionalToRequired", () => {
    expect(
      S.asSchema(
        S.Struct({
          a: S.optionalToRequired(aContext, S.String, { decode: Option.getOrElse(() => ""), encode: Option.some })
        })
      )
    ).type.toBe<S.Schema<{ readonly a: string }, { readonly a?: string }, "a">>()
    expect(
      S.Struct({
        a: S.optionalToRequired(aContext, S.String, { decode: Option.getOrElse(() => ""), encode: Option.some })
      })
    ).type.toBe<S.Struct<{ a: S.PropertySignature<":", string, never, "?:", string, false, "a"> }>>()
  })

  it("requiredToOptional", () => {
    expect(
      S.asSchema(
        S.Struct({
          a: S.requiredToOptional(aContext, S.String, { decode: Option.some, encode: Option.getOrElse(() => "") })
        })
      )
    ).type.toBe<S.Schema<{ readonly a?: string }, { readonly a: string }, "a">>()
    expect(
      S.Struct({
        a: S.requiredToOptional(aContext, S.String, { decode: Option.some, encode: Option.getOrElse(() => "") })
      })
    ).type.toBe<S.Struct<{ a: S.PropertySignature<"?:", string, never, ":", string, false, "a"> }>>()
  })

  it("minItems", () => {
    expect(S.asSchema(S.Array(S.String).pipe(S.minItems(2))))
      .type.toBe<S.Schema<ReadonlyArray<string>, ReadonlyArray<string>>>()
    expect(S.Array(S.String).pipe(S.minItems(2)))
      .type.toBe<S.filter<S.Schema<ReadonlyArray<string>>>>()
    expect(S.Array(S.String).pipe(S.minItems(2)).from)
      .type.toBe<S.Schema<ReadonlyArray<string>>>()
    expect(S.asSchema(S.Array(S.String).pipe(S.minItems(1), S.maxItems(2))))
      .type.toBe<S.Schema<ReadonlyArray<string>, ReadonlyArray<string>>>()
    expect(S.Array(S.String).pipe(S.minItems(1), S.maxItems(2)))
      .type.toBe<S.filter<S.Schema<ReadonlyArray<string>>>>()
  })

  it("minItems NonEmptyArray", () => {
    expect(S.asSchema(S.NonEmptyArray(S.String).pipe(S.minItems(2))))
      .type.toBe<S.Schema<readonly [string, ...Array<string>]>>()
    expect(S.NonEmptyArray(S.String).pipe(S.minItems(2)))
      .type.toBe<S.filter<S.Schema<readonly [string, ...Array<string>]>>>()
    expect(S.NonEmptyArray(S.String).pipe(S.minItems(2)).from)
      .type.toBe<S.Schema<readonly [string, ...Array<string>]>>()
  })

  it("maxItems Array", () => {
    expect(S.asSchema(S.Array(S.String).pipe(S.maxItems(2))))
      .type.toBe<S.Schema<ReadonlyArray<string>>>()
    expect(S.Array(S.String).pipe(S.maxItems(2)))
      .type.toBe<S.filter<S.Schema<ReadonlyArray<string>>>>()
    expect(S.Array(S.String).pipe(S.maxItems(2)).from)
      .type.toBe<S.Schema<ReadonlyArray<string>>>()
    expect(S.asSchema(S.Array(S.String).pipe(S.maxItems(2), S.minItems(1))))
      .type.toBe<S.Schema<ReadonlyArray<string>>>()
    expect(S.Array(S.String).pipe(S.maxItems(2), S.minItems(1)))
      .type.toBe<S.filter<S.Schema<ReadonlyArray<string>>>>()
  })

  it("maxItems NonEmptyArray", () => {
    expect(S.asSchema(S.NonEmptyArray(S.String).pipe(S.maxItems(2))))
      .type.toBe<S.Schema<readonly [string, ...Array<string>]>>()
    expect(S.NonEmptyArray(S.String).pipe(S.maxItems(2))).type.toBe<
      S.filter<S.Schema<readonly [string, ...Array<string>]>>
    >()
    expect(S.NonEmptyArray(S.String).pipe(S.maxItems(2)).from).type.toBe<
      S.Schema<readonly [string, ...Array<string>]>
    >()
  })

  it("itemsCount Array", () => {
    expect(S.asSchema(S.Array(S.String).pipe(S.itemsCount(2))))
      .type.toBe<S.Schema<ReadonlyArray<string>>>()
    expect(S.Array(S.String).pipe(S.itemsCount(2)))
      .type.toBe<S.filter<S.Schema<ReadonlyArray<string>>>>()
    expect(S.Array(S.String).pipe(S.itemsCount(2)).from).type.toBe<S.Schema<ReadonlyArray<string>>>()
  })

  it("itemsCount NonEmptyArray", () => {
    expect(S.asSchema(S.NonEmptyArray(S.String).pipe(S.itemsCount(2))))
      .type.toBe<S.Schema<readonly [string, ...Array<string>]>>()
    expect(S.NonEmptyArray(S.String).pipe(S.itemsCount(2)))
      .type.toBe<S.filter<S.Schema<readonly [string, ...Array<string>]>>>()
    expect(S.NonEmptyArray(S.String).pipe(S.itemsCount(2)).from).type.toBe<
      S.Schema<readonly [string, ...Array<string>]>
    >()
  })

  it("TemplateLiteralParser", () => {
    expect(S.asSchema(S.TemplateLiteralParser("a")))
      .type.toBe<S.Schema<readonly ["a"], "a">>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Literal("a"))))
      .type.toBe<S.Schema<readonly ["a"], "a">>()
    expect(S.asSchema(S.TemplateLiteralParser(1)))
      .type.toBe<S.Schema<readonly [1], "1">>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Literal(1))))
      .type.toBe<S.Schema<readonly [1], "1">>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String)))
      .type.toBe<S.Schema<readonly [string], string>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Number)))
      .type.toBe<S.Schema<readonly [number], `${number}`>>()
    expect(S.asSchema(S.TemplateLiteralParser("a", "b")))
      .type.toBe<S.Schema<readonly ["a", "b"], "ab">>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Literal("a"), S.Literal("b"))))
      .type.toBe<S.Schema<readonly ["a", "b"], "ab">>()
    expect(S.asSchema(S.TemplateLiteralParser("a", S.String)))
      .type.toBe<S.Schema<readonly ["a", string], `a${string}`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Literal("a"), S.String)))
      .type.toBe<S.Schema<readonly ["a", string], `a${string}`>>()
    expect(S.asSchema(S.TemplateLiteralParser("a", S.Number)))
      .type.toBe<S.Schema<readonly ["a", number], `a${number}`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Literal("a"), S.Number)))
      .type.toBe<S.Schema<readonly ["a", number], `a${number}`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, "a")))
      .type.toBe<S.Schema<readonly [string, "a"], `${string}a`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, S.Literal("a"))))
      .type.toBe<S.Schema<readonly [string, "a"], `${string}a`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Number, "a")))
      .type.toBe<S.Schema<readonly [number, "a"], `${number}a`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Number, S.Literal("a"))))
      .type.toBe<S.Schema<readonly [number, "a"], `${number}a`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, 0)))
      .type.toBe<S.Schema<readonly [string, 0], `${string}0`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, true)))
      .type.toBe<S.Schema<readonly [string, true], `${string}true`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, null)))
      .type.toBe<S.Schema<readonly [string, null], `${string}null`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, 1n)))
      .type.toBe<S.Schema<readonly [string, 1n], `${string}1`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, S.Literal("a", 0))))
      .type.toBe<S.Schema<readonly [string, 0 | "a"], `${string}a` | `${string}0`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, S.Literal("/"), S.Number)))
      .type.toBe<S.Schema<readonly [string, "/", number], `${string}/${number}`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, "/", S.Number)))
      .type.toBe<S.Schema<readonly [string, "/", number], `${string}/${number}`>>()
    const EmailLocaleIDs = S.Literal("welcome_email", "email_heading")
    const FooterLocaleIDs = S.Literal("footer_title", "footer_sendoff")
    expect(S.asSchema(S.TemplateLiteralParser(S.Union(EmailLocaleIDs, FooterLocaleIDs), S.Literal("_id"))))
      .type.toBe<
      S.Schema<
        readonly ["welcome_email" | "email_heading" | "footer_title" | "footer_sendoff", "_id"],
        "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id",
        never
      >
    >()
    expect(S.asSchema(S.TemplateLiteralParser(S.Union(EmailLocaleIDs, FooterLocaleIDs), "_id")))
      .type.toBe<
      S.Schema<
        readonly ["welcome_email" | "email_heading" | "footer_title" | "footer_sendoff", "_id"],
        "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id",
        never
      >
    >()
    expect(S.asSchema(S.TemplateLiteralParser(S.String.pipe(S.brand("MyBrand")))))
      .type.toBe<S.Schema<readonly [string & Brand.Brand<"MyBrand">], string>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Number.pipe(S.brand("MyBrand")))))
      .type.toBe<S.Schema<readonly [number & Brand.Brand<"MyBrand">], `${number}`>>()
    expect(S.asSchema(S.TemplateLiteralParser("a", S.String.pipe(S.brand("MyBrand")))))
      .type.toBe<S.Schema<readonly ["a", string & Brand.Brand<"MyBrand">], `a${string}`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Literal("a"), S.String.pipe(S.brand("MyBrand")))))
      .type.toBe<S.Schema<readonly ["a", string & Brand.Brand<"MyBrand">], `a${string}`>>()
    expect(
      S.asSchema(
        S.TemplateLiteralParser(S.Literal("a").pipe(S.brand("L")), S.String.pipe(S.brand("MyBrand")))
      )
    ).type.toBe<
      S.Schema<readonly [("a" & Brand.Brand<"L">), string & Brand.Brand<"MyBrand">], `a${string}`>
    >()
    expect(S.asSchema(S.TemplateLiteralParser("a", S.Number.pipe(S.brand("MyBrand")))))
      .type.toBe<S.Schema<readonly ["a", number & Brand.Brand<"MyBrand">], `a${number}`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Literal("a"), S.Number.pipe(S.brand("MyBrand")))))
      .type.toBe<S.Schema<readonly ["a", number & Brand.Brand<"MyBrand">], `a${number}`>>()
    expect(S.asSchema(S.TemplateLiteralParser("a", S.Union(S.Number, S.String))))
      .type.toBe<S.Schema<readonly ["a", string | number], `a${string}` | `a${number}`>>()
  })

  it("UndefinedOr", () => {
    expect(S.UndefinedOr(S.Never))
      .type.toBe<S.UndefinedOr<typeof S.Never>>()
  })

  it("NullOr", () => {
    expect(S.NullOr(S.Never))
      .type.toBe<S.NullOr<typeof S.Never>>()
  })

  it("NullishOr", () => {
    expect(S.NullishOr(S.Never))
      .type.toBe<S.NullishOr<typeof S.Never>>()
  })

  it("Config", () => {
    expect(S.Config("A", S.String))
      .type.toBe<Config.Config<string>>()
    expect(S.Config("A", S.BooleanFromString))
      .type.toBe<Config.Config<boolean>>()
    expect(S.Config("A", S.TemplateLiteral(S.Literal("a"), S.String)))
      .type.toBe<Config.Config<`a${string}`>>()

    // passed schemas must be encodable to string
    // @ts-expect-error
    S.Config("A", S.Boolean)
  })
})
