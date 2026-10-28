import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import {
  getCoalescedFilesystemFixture,
  pause,
  source,
} from "tests/fixtures/get-coalesced-filesystem-fixture"

test("continuous saves make progress and eventually publish the final edit", async () => {
  const { directory, updates, content } = await getCoalescedFilesystemFixture()
  for (let width = 11; width <= 30; width++) {
    await writeFile(join(directory, "index.tsx"), source(width))
    await pause(100)
    if (width === 23) expect((await updates()).length).toBeGreaterThan(0)
  }
  await pause(650)
  expect(await content()).toBe(source(30))
  expect((await updates()).length).toBeLessThanOrEqual(3)
}, 6000)
