import { expect, test } from "bun:test"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import {
  getCoalescedFilesystemFixture,
  pause,
  source,
} from "tests/fixtures/get-coalesced-filesystem-fixture"

test("browser text and binary writes do not echo back as filesystem updates", async () => {
  const { server, directory, updates } = await getCoalescedFilesystemFixture()
  const textContent = `${source(20)} // 10 kΩ`
  const binaryContent = Buffer.from([0x00, 0x80, 0xff])
  await server.fsKy.post("api/files/upsert", {
    json: { file_path: "index.tsx", text_content: textContent },
  })
  await server.fsKy.post("api/files/upsert", {
    json: {
      file_path: "image.png",
      binary_content_b64: binaryContent.toString("base64"),
    },
  })
  for (const filePath of ["index.tsx", "image.png"]) {
    await server.handleFileUpdatedEventFromServer({
      event_id: `browser-${filePath}`,
      event_type: "FILE_UPDATED",
      file_path: filePath,
      initiator: "browser_edit",
      created_at: new Date().toISOString(),
    })
  }
  await pause(650)
  expect(await readFile(join(directory, "index.tsx"), "utf-8")).toBe(
    textContent,
  )
  expect(await readFile(join(directory, "image.png"))).toEqual(binaryContent)
  expect(await updates()).toHaveLength(1)
  expect(await updates("image.png")).toHaveLength(1)
  for (const event of [...(await updates()), ...(await updates("image.png"))]) {
    expect(event.initiator).not.toBe("filesystem_change")
  }
})
