import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readdir, mkdir } from "node:fs/promises"
import path from "node:path"
import fs from "node:fs"

test("build --kicad generates centralized kicad-footprints library", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create a circuit file
  await mkdir(path.join(tmpDir, "examples"), { recursive: true })
  const circuitCode = `
export default () => (
  <resistor resistance="1k" footprint="0402" name="R1" pcbX={0} pcbY={0} />
)
`
  await writeFile(path.join(tmpDir, "examples", "my-circuit.tsx"), circuitCode)

  // Create package.json at root
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-proj", version: "1.0.0" }),
  )

  const { stdout, stderr } = await runCommand(
    "tsci build --kicad ./examples/my-circuit.tsx",
  )

  if (stderr) console.error(stderr)

  expect(stdout).toContain("Generating centralized KiCad footprint library")

  // Check that the kicad-footprints directory was created
  const kicadFootprintsDir = path.join(tmpDir, "dist", "kicad-footprints")
  expect(fs.existsSync(kicadFootprintsDir)).toBe(true)

  // Check for expected KiCad library files
  const files = await readdir(kicadFootprintsDir, { recursive: true })
  const fileList = files.map((f) => f.toString())

  // Should have .pretty directory and fp-lib-table
  expect(fileList.some((f) => f.endsWith(".pretty"))).toBe(true)
  expect(fileList.some((f) => f.includes("fp-lib-table"))).toBe(true)

  // Check for the footprint itself (0402 probably gets mapped to something)
  // The sanitizeLibraryAndFootprintName might name it "generated.pretty/footprint.kicad_mod"
  // if it's not specified.
  expect(fileList.some((f) => f.endsWith(".kicad_mod"))).toBe(true)
}, 120_000)
