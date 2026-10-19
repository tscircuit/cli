import { expect, test } from "bun:test"
import { getIndex } from "lib/site/getIndex"

test("getIndex without extra tabs injects an empty list", async () => {
  expect(await getIndex()).toContain(
    "window.TSCIRCUIT_EXTRA_RUNFRAME_TABS = [];",
  )
})
