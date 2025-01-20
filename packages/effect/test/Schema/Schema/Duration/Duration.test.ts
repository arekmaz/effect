import { Duration } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Duration", () => {
  const schema = S.Duration

  it.todo("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, [555, 123456789], Duration.nanos(555123456789n))
    await Util.assertions.decoding.fail(
      schema,
      [-500, 0],
      `Duration
└─ Encoded side transformation failure
   └─ HRTime
      └─ [0]
         └─ NonNegativeInt
            └─ From side refinement failure
               └─ NonNegative
                  └─ Predicate refinement failure
                     └─ Expected a non-negative number, actual -500`
    )
    await Util.assertions.decoding.fail(
      schema,
      [0, -123],
      `Duration
└─ Encoded side transformation failure
   └─ HRTime
      └─ [1]
         └─ NonNegativeInt
            └─ From side refinement failure
               └─ NonNegative
                  └─ Predicate refinement failure
                     └─ Expected a non-negative number, actual -123`
    )
    await Util.assertions.decoding.fail(
      schema,
      123,
      `Duration
└─ Encoded side transformation failure
   └─ Expected HRTime, actual 123`
    )
    await Util.assertions.decoding.fail(
      schema,
      123n,
      `Duration
└─ Encoded side transformation failure
   └─ Expected HRTime, actual 123n`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, Duration.seconds(5), [5, 0])
    await Util.assertions.encoding.succeed(schema, Duration.millis(123456789), [123456, 789000000])
    await Util.assertions.encoding.succeed(schema, Duration.nanos(555123456789n), [555, 123456789])
  })
})
