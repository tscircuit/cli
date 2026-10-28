import { expect, test } from "bun:test"
import { rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import {
  getCoalescedFilesystemFixture,
  pause,
  source,
} from "tests/fixtures/get-coalesced-filesystem-fixture"

test("disposal drops queued saves and file deletion is still delivered", async () => {
  const { server, directory } = await getCoalescedFilesystemFixture()
  await rm(join(directory, "index.tsx"))
  await pause(650)
  expect(
    (await server.fsKy.get("api/files/list").json()).file_list.map(
      (file) => file.file_path,
    ),
  ).not.toContain("index.tsx")
  await writeFile(join(directory, "index.tsx"), source(40))
  await pause(30)
  await server.stop()
  await pause(400)
})
