import { expect, test } from "bun:test"
import { getPublicDistEnabledFromOptions } from "cli/registry/packages/update/register"

test("public dist flags map to public_dist_enabled payload values", () => {
  expect(getPublicDistEnabledFromOptions({ enablePublicDist: true })).toBe(true)
  expect(getPublicDistEnabledFromOptions({ disablePublicDist: true })).toBe(
    false,
  )
  expect(getPublicDistEnabledFromOptions({})).toBeUndefined()
})
