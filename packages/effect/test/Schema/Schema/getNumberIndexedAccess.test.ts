import * as Duration from "effect/Duration"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("getNumberIndexedAccess", () => {
  it("tuple", async () => {
    const schema = S.getNumberIndexedAccess(S.Tuple(S.NumberFromString, S.Duration))
    await Util.assertions.decoding.succeed(schema, "1", 1)
    await Util.assertions.decoding.succeed(schema, [1, 0], Duration.nanos(1000000000n))
    await Util.assertions.encoding.succeed(schema, 1, "1")
    await Util.assertions.encoding.succeed(schema, Duration.nanos(1000000000n), [1, 0])
  })

  it("tuple with optional element", async () => {
    const schema = S.getNumberIndexedAccess(S.Tuple(S.NumberFromString, S.optionalElement(S.Duration)))
    await Util.assertions.decoding.succeed(schema, undefined)
    await Util.assertions.decoding.succeed(schema, "1", 1)
    await Util.assertions.decoding.succeed(schema, [1, 0], Duration.nanos(1000000000n))
    await Util.assertions.encoding.succeed(schema, undefined, undefined)
    await Util.assertions.encoding.succeed(schema, 1, "1")
    await Util.assertions.encoding.succeed(schema, Duration.nanos(1000000000n), [1, 0])
  })

  it("array", async () => {
    const schema = S.getNumberIndexedAccess(S.Array(S.NumberFromString))
    await Util.assertions.decoding.succeed(schema, "1", 1)
    await Util.assertions.encoding.succeed(schema, 1, "1")
  })

  it("union", async () => {
    const schema = S.getNumberIndexedAccess(S.Union(S.Array(S.Number), S.Array(S.String)))
    await Util.assertions.decoding.succeed(schema, "a")
    await Util.assertions.decoding.succeed(schema, 1)
    await Util.assertions.encoding.succeed(schema, "a", "a")
    await Util.assertions.encoding.succeed(schema, 1, 1)
  })
})
