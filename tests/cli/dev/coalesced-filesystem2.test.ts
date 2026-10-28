import { expect, test } from "bun:test"
import { mkdir, rename, writeFile } from "node:fs/promises"
import { join } from "node:path"
import {
  getCoalescedFilesystemFixture,
  pause,
  source,
} from "tests/fixtures/get-coalesced-filesystem-fixture"

test("single save, atomic replacement, same-content save and generated cache", async () => {
  const { directory, updates, content } = await getCoalescedFilesystemFixture()
  await writeFile(join(directory, "index.tsx"), source(20))
  await pause(650)
  expect(await content()).toBe(source(20))
  await writeFile(join(directory, ".index.tsx.tmp"), source(30))
  await rename(join(directory, ".index.tsx.tmp"), join(directory, "index.tsx"))
  await pause(650)
  expect(await content()).toBe(source(30))
  await writeFile(join(directory, "index.tsx"), source(30))
  await mkdir(join(directory, ".tscircuit/cache"), { recursive: true })
  await writeFile(join(directory, ".tscircuit/cache/result.json"), "{}")
  await pause(650)
  expect(await updates()).toHaveLength(2)
})
