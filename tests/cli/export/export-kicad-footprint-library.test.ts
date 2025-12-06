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

test("export kicad footprint library", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stderr } = await runCommand(
    `tsci export ${circuitPath} -f kicad-footprint-library`,
  )

  expect(stderr).toBe("")

  const zipBuffer = await readFile(
    path.join(tmpDir, "test-circuit-footprints.zip"),
  )

  const zip = await JSZip.loadAsync(zipBuffer)

  // Check that fp-lib-table exists
  const libTable = zip.file("fp-lib-table")
  expect(libTable).not.toBeNull()

  const libTableContent = await libTable!.async("string")
  expect(libTableContent).toContain("fp_lib_table")
  expect(libTableContent).toContain("KiCad")

  // Check that at least one .pretty folder with .kicad_mod file exists
  const files = Object.keys(zip.files)
  const prettyFolders = files.filter((f) => f.includes(".pretty/"))
  expect(prettyFolders.length).toBeGreaterThan(0)

  const kicadModFiles = files.filter((f) => f.endsWith(".kicad_mod"))
  expect(kicadModFiles.length).toBeGreaterThan(0)

  // Check content of a footprint file
  const firstFootprint = zip.file(kicadModFiles[0])
  expect(firstFootprint).not.toBeNull()

  const footprintContent = await firstFootprint!.async("string")
  expect(footprintContent).toContain("footprint")
}, 60_000)
