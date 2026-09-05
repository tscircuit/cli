import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { nodeFilesystem } from "lib/shared/node-filesystem"

test("node filesystem reads exact bytes from a file URL", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "tsci-node-fs-"))
  try {
    const file = path.join(dir, "model #1%.obj")
    const bytes = new Uint8Array([0, 127, 128, 255])
    await writeFile(file, bytes)
    expect(await nodeFilesystem.readFile(pathToFileURL(file))).toEqual(bytes)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
