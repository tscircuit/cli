import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor
      resistance="1k"
      footprint="0402"
      name="R1"
      schX={3}
      pcbX={3}
    />
    <capacitor
      capacitance="1000pF"
      footprint="0402"
      name="C1"
      schX={-3}
      pcbX={-3}
    />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)`

test("export kicad schematic", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stderr } = await runCommand(`tsci export ${circuitPath} -f kicad_sch`)

  expect(stderr).toBe("")

  const schContent = await readFile(
    path.join(tmpDir, "test-circuit.kicad_sch"),
    "utf-8",
  )
  expect(schContent).toContain("kicad_sch")
}, 60_000)

test("export kicad pcb", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stderr } = await runCommand(`tsci export ${circuitPath} -f kicad_pcb`)

  expect(stderr).toBe("")

  const pcbContent = await readFile(
    path.join(tmpDir, "test-circuit.kicad_pcb"),
    "utf-8",
  )
  expect(pcbContent).toContain("kicad_pcb")
}, 60_000)

test("export kicad zip", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stderr } = await runCommand(`tsci export ${circuitPath} -f kicad_zip`)

  expect(stderr).toBe("")

  const zipBuffer = await readFile(path.join(tmpDir, "test-circuit-kicad.zip"))

  const zip = await JSZip.loadAsync(zipBuffer)
  const schEntry = zip.file("test-circuit.kicad_sch")
  const pcbEntry = zip.file("test-circuit.kicad_pcb")

  expect(schEntry).not.toBeNull()
  expect(pcbEntry).not.toBeNull()

  const schContent = await schEntry!.async("string")
  const pcbContent = await pcbEntry!.async("string")

  expect(schContent).toContain("kicad_sch")
  expect(pcbContent).toContain("kicad_pcb")
}, 60_000)
