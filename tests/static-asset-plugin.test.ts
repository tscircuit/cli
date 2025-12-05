import { expect, test } from "bun:test"
import { readdir } from "node:fs/promises"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { temporaryDirectory } from "tempy"
import { createStaticAssetPlugin } from "cli/build/transpile/static-asset-plugin"

test("assets with identical content share the same hashed filename", async () => {
  const projectDir = temporaryDirectory()
  const outputDir = path.join(projectDir, "dist")

  mkdirSync(projectDir, { recursive: true })

  const assetAPath = path.join(projectDir, "image-a.png")
  const assetBPath = path.join(projectDir, "image-b.png")
  const entryPath = path.join(projectDir, "entry.js")

  const sharedContent = new Uint8Array([0xde, 0xad, 0xbe, 0xef])
  writeFileSync(assetAPath, sharedContent)
  writeFileSync(assetBPath, sharedContent)

  writeFileSync(
    entryPath,
    "import imgA from './image-a.png'; import imgB from './image-b.png'; export const assets=[imgA,imgB];",
  )

  const plugin = createStaticAssetPlugin({ outputDir, projectDir })

  plugin.buildStart?.call({} as any)

  const resolvedA = plugin.resolveId?.("./image-a.png", entryPath)
  const resolvedB = plugin.resolveId?.("./image-b.png", entryPath)

  if (typeof resolvedA !== "object" || resolvedA === null) {
    throw new Error("Failed to resolve image-a.png")
  }

  if (typeof resolvedB !== "object" || resolvedB === null) {
    throw new Error("Failed to resolve image-b.png")
  }

  const chunk: any = {
    code: `export const assets = ["${resolvedA.id}", "${resolvedB.id}"]`,
    type: "chunk",
    imports: [resolvedA.id, resolvedB.id],
    fileName: "entry.js",
    map: null,
  }

  await plugin.generateBundle?.call({} as any, {}, { entry: chunk } as any)

  const assetFiles = await readdir(path.join(outputDir, "assets"))
  expect(assetFiles).toHaveLength(1)

  const hashedFilePath = `./assets/${assetFiles[0]}`
  const occurrences =
    chunk.code.match(new RegExp(hashedFilePath, "g"))?.length ?? 0
  expect(occurrences).toBe(2)
})
