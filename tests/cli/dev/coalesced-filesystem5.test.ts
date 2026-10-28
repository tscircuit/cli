import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import {
  getCoalescedFilesystemFixture,
  pause,
} from "tests/fixtures/get-coalesced-filesystem-fixture"

test("binary saves compare exact bytes and suppress unchanged uploads", async () => {
  const { server, directory, updates } = await getCoalescedFilesystemFixture()
  const filePath = join(directory, "image.png")
  // Both bytes decode to the same replacement character as UTF-8 text.
  const original = Buffer.from([0x80])
  const changed = Buffer.from([0x81])
  await writeFile(filePath, original)
  await pause(650)
  expect(await updates("image.png")).toHaveLength(1)

  await writeFile(filePath, original)
  await pause(650)
  expect(await updates("image.png")).toHaveLength(1)

  await writeFile(filePath, changed)
  await pause(650)
  expect(await updates("image.png")).toHaveLength(2)
  const { file } = await server.fsKy
    .get("api/files/get", { searchParams: { file_path: "image.png" } })
    .json()
  expect(file.binary_content_b64).toBe(changed.toString("base64"))
})
