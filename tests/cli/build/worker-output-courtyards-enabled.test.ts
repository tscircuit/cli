import { test, expect } from "bun:test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { temporaryDirectory } from "tempy"
import { writeImageAssetsFromCircuitJson } from "cli/build/worker-output-generators"

test("writeImageAssetsFromCircuitJson includes courtyards when showCourtyards is true", async () => {
  const outputDir = temporaryDirectory()

  const circuitJson = [
    {
      type: "pcb_courtyard_rect",
      pcb_courtyard_rect_id: "courtyard_test",
      layer: "top",
      center: { x: 0, y: 0 },
      width: 2,
      height: 2,
    },
  ]

  await writeImageAssetsFromCircuitJson(circuitJson as any, {
    outputDir,
    imageFormats: {
      pcbSvgs: true,
      pcbPngs: false,
      schematicSvgs: false,
      threeDPngs: false,
    },
    pcbSnapshotSettings: { showCourtyards: true },
  })

  const svg = await readFile(path.join(outputDir, "pcb.svg"), "utf-8")
  expect(svg).toContain("pcb-courtyard-")
})
