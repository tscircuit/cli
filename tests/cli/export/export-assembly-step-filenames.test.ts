import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import JSZip from "jszip"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("assembly STEP keeps safe, case-insensitive unique filenames with the single-assembly converter API", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "parts.circuit.json")
  const circuitJson: CircuitJson = ["Base/Case", "base_case", "../"].flatMap(
    (name, index): CircuitJson => [
      {
        type: "source_component",
        source_component_id: `part_${index}`,
        ftype: "printedpart",
        name,
      },
      {
        type: "cad_component",
        cad_component_id: `cad_${index}`,
        source_component_id: `part_${index}`,
        position: { x: index * 8, y: 0, z: 0 },
        model_jscad: { type: "cuboid", size: [4, 6, 2] },
        model_object_fit: "contain_within_bounds",
        anchor_alignment: "center",
      },
    ],
  )
  await writeFile(circuitPath, JSON.stringify(circuitJson))
  const { exitCode, stderr } = await runCommand(
    `tsci export ${circuitPath} --format assembly-step`,
  )
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  const zip = await JSZip.loadAsync(
    await readFile(path.join(tmpDir, "parts.circuit-assembly.zip")),
  )
  expect(Object.keys(zip.files)).toEqual([
    "Base_Case.step",
    "base_case-2.step",
    "printed-part.step",
  ])
  for (const file of Object.values(zip.files)) {
    const step = await file.async("string")
    expect(step).toStartWith("ISO-10303-21;")
    expect(step.match(/= MANIFOLD_SOLID_BREP\(/g)).toHaveLength(1)
  }
}, 30_000)
