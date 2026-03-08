import { test, expect } from "bun:test"
import { buildFile } from "cli/build/build-file"
import { writeFile, mkdir, mkdtemp } from "node:fs/promises"
import path from "node:path"
import os from "node:os"

test("buildFile returns hasWarnings when circuit JSON contains warnings", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "build-test-"))
  const inputPath = path.join(tmpDir, "circuit.json")
  const outputPath = path.join(tmpDir, "dist", "circuit.json")

  const circuitJson = [
    { type: "source_component", source_component_id: "sc1", name: "R1" },
    { type: "pcb_placement_warning", message: "Too close to edge" },
  ]

  await writeFile(inputPath, JSON.stringify(circuitJson))

  const result = await buildFile(inputPath, outputPath, tmpDir)

  expect(result.ok).toBe(true)
  expect(result.hasWarnings).toBe(true)
  expect(result.hasErrors).toBe(false)
})
