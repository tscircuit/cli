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

test("export kicad symbol library", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stderr } = await runCommand(
    `tsci export ${circuitPath} -f kicad-symbol-library`,
  )

  expect(stderr).toBe("")

  const zipBuffer = await readFile(
    path.join(tmpDir, "test-circuit-symbols.zip"),
  )

  const zip = await JSZip.loadAsync(zipBuffer)

  // Check that sym-lib-table exists
  const libTable = zip.file("sym-lib-table")
  expect(libTable).not.toBeNull()

  const libTableContent = await libTable!.async("string")
  expect(libTableContent).toContain("sym_lib_table")
  expect(libTableContent).toContain("KiCad")

  // Check that at least one .kicad_sym file exists
  const files = Object.keys(zip.files)
  const kicadSymFiles = files.filter((f) => f.endsWith(".kicad_sym"))
  expect(kicadSymFiles.length).toBeGreaterThan(0)

  // Check content of a symbol file
  const firstSymbol = zip.file(kicadSymFiles[0])
  expect(firstSymbol).not.toBeNull()

  const symbolContent = await firstSymbol!.async("string")
  expect(symbolContent).toContain("kicad_symbol_lib")
  expect(symbolContent).toContain("symbol")
}, 60_000)
