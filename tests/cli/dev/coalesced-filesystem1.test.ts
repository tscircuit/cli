import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import {
  getCoalescedFilesystemFixture,
  pause,
  source,
} from "tests/fixtures/get-coalesced-filesystem-fixture"

test("rapid saves publish only the final source after a quiet period", async () => {
  const { directory, updates, content } = await getCoalescedFilesystemFixture()
  for (let width = 11; width <= 15; width++) {
    await writeFile(join(directory, "index.tsx"), source(width))
    await pause(80)
  }
  await pause(700)
  console.log(`burst: ${(await updates()).length} file updates`)
  expect(await updates()).toHaveLength(1)
  expect(await content()).toBe(source(15))
})
