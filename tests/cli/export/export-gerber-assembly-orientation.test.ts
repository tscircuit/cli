import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import JSZip from "jszip"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("Gerber export uses a supplied assembly zero orientation for the placement CSV", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuit: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "source_component_1",
      ftype: "simple_chip",
      name: "U1",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_1",
      source_component_id: "source_component_1",
      center: { x: 10, y: 20 },
      width: 4,
      height: 4,
      layer: "top",
      rotation: 270,
      obstructs_within_bounds: true,
      pin1_location: "bottomside_left",
      supplier_pin1_location_map: { jlcpcb: "leftside_top" },
    },
  ]
  const circuitPath = path.join(tmpDir, "orientation.circuit.json")
  const locationsPath = path.join(tmpDir, "assembly.json")
  const outputPath = path.join(tmpDir, "fabrication.zip")
  await writeFile(circuitPath, JSON.stringify(circuit))
  await writeFile(locationsPath, JSON.stringify({ U1: "bottomside_left" }))

  const { exitCode, stderr } = await runCommand(
    `tsci export ${circuitPath} --format gerbers --output ${outputPath} --assembly-pin1-locations ${locationsPath}`,
  )
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  const zip = await JSZip.loadAsync(await readFile(outputPath))
  expect(await zip.file("pick_and_place.csv")!.async("string")).toContain(
    "U1,10.000,20.000,top,270",
  )
})
