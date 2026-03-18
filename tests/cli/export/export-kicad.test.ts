import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

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
  const proEntry = zip.file("test-circuit.kicad_pro")

  expect(schEntry).not.toBeNull()
  expect(pcbEntry).not.toBeNull()
  expect(proEntry).not.toBeNull()

  const schContent = await schEntry!.async("string")
  const pcbContent = await pcbEntry!.async("string")

  expect(schContent).toContain("kicad_sch")
  expect(pcbContent).toContain("kicad_pcb")

  const proContent = await proEntry!.async("string")
  const proJson = JSON.parse(proContent)
  expect(proJson.head.generator).toBe("circuit-json-to-kicad")
  expect(proJson.head.project_name).toBe("test-circuit")
}, 60_000)

test("export kicad zip includes 3d models", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stderr } = await runCommand(`tsci export ${circuitPath} -f kicad_zip`)

  expect(stderr).toBe("")

  const zipBuffer = await readFile(path.join(tmpDir, "test-circuit-kicad.zip"))
  const zip = await JSZip.loadAsync(zipBuffer)

  const pcbEntry = zip.file("test-circuit.kicad_pcb")
  expect(pcbEntry).not.toBeNull()
  const pcbContent = await pcbEntry!.async("string")

  // PCB should reference 3D models via KIPRJMOD
  expect(pcbContent).toContain(
    "${KIPRJMOD}/3dmodels/tscircuit_builtin.3dshapes",
  )

  // 3D model files should be included in the zip
  const modelFiles = Object.keys(zip.files).filter(
    (f) =>
      f.startsWith("3dmodels/tscircuit_builtin.3dshapes/") && !f.endsWith("/"),
  )
  expect(modelFiles).toContain("3dmodels/tscircuit_builtin.3dshapes/0402.step")

  // Each model file should have non-zero content
  for (const modelFile of modelFiles) {
    const entry = zip.files[modelFile]
    const content = await entry.async("nodebuffer")
    expect(content.length).toBeGreaterThan(0)
  }
}, 60_000)
