import { expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { exportSnippet } from "lib/shared/export-snippet"
import { convertModelUrlsToFileUrls } from "cli/build/convert-model-urls-to-file-urls"

const createMinimalGlb = () => {
  const json = JSON.stringify({ asset: { version: "2.0" }, scenes: [] })
  const padding = (4 - (json.length % 4)) % 4
  const paddedJson = `${json}${" ".repeat(padding)}`
  const jsonChunk = Buffer.from(paddedJson, "utf8")

  const totalLength = 12 + 8 + jsonChunk.length
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(totalLength, 8)

  const chunkHeader = Buffer.alloc(8)
  chunkHeader.writeUInt32LE(jsonChunk.length, 0)
  chunkHeader.writeUInt32LE(0x4e4f534a, 4)

  return Buffer.concat([header, chunkHeader, jsonChunk])
}

test("convertModelUrlsToFileUrls resolves relative paths against specified baseDir (#5654)", () => {
  const baseDir = path.resolve("/fake/project/dir")
  const circuitJson = [
    {
      type: "pcb_component",
      pcb_component_id: "comp_1",
      model_step_url: "./libraries/cap.step",
      model_glb_url: "libraries/cap.glb",
      glb_model_url: "https://example.com/remote.glb",
    },
  ]

  const converted = convertModelUrlsToFileUrls(circuitJson, baseDir)
  expect(converted[0].model_step_url).toStartWith("file://")
  expect(converted[0].model_step_url).toContain("libraries/cap.step")
  expect(converted[0].model_glb_url).toStartWith("file://")
  expect(converted[0].model_glb_url).toContain("libraries/cap.glb")
  expect(converted[0].glb_model_url).toBe("https://example.com/remote.glb")
})

test("exportSnippet with format glb loads relative modelUrl without 404 (#5654)", async () => {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "tsci-export-glb-"),
  )
  const circuitJsonPath = path.join(
    temporaryDirectory,
    "index.circuit.json",
  )
  const librariesDir = path.join(temporaryDirectory, "libraries")
  await mkdir(librariesDir, { recursive: true })
  await writeFile(path.join(librariesDir, "cap.glb"), createMinimalGlb())

  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
    },
    {
      type: "pcb_component",
      pcb_component_id: "comp_1",
      center: { x: 0, y: 0 },
      width: 2,
      height: 2,
      layer: "top",
      rotation: 0,
      model_glb_url: "./libraries/cap.glb",
    },
  ]

  try {
    await writeFile(circuitJsonPath, JSON.stringify(circuitJson))

    let glbBuffer: Buffer | undefined
    let exitCode: number | undefined
    await exportSnippet({
      filePath: circuitJsonPath,
      outputPath: path.join(temporaryDirectory, "index.glb"),
      format: "glb",
      writeFile: true,
      onExit: (code) => {
        exitCode = code
      },
      onError: (message) => {
        throw new Error(message)
      },
      onSuccess: ({ outputContent }) => {
        glbBuffer = outputContent as Buffer
      },
    })

    expect(exitCode).toBe(0)
    expect(glbBuffer).toBeDefined()
    expect(glbBuffer!.subarray(0, 4).toString()).toBe("glTF")

    const writtenGlb = await readFile(path.join(temporaryDirectory, "index.glb"))
    expect(writtenGlb.subarray(0, 4).toString()).toBe("glTF")
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
})
