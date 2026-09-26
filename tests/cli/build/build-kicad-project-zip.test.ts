import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import fs from "node:fs"
import JSZip from "jszip"

test("build --kicad-project-zip creates a zip and removes kicad dir", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const circuitPath = path.join(tmpDir, "my-board.tsx")
  await writeFile(
    circuitPath,
    `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={0} pcbY={0} />
  </board>
)
`,
  )

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ type: "module", dependencies: { react: "^19.1.0" } }),
  )

  await runCommand("tsci install")

  const { stderr } = await runCommand(
    `tsci build --kicad-project-zip ${circuitPath}`,
  )
  expect(stderr).toBe("")

  const zipPath = path.join(tmpDir, "dist", "my-board", "my-board-kicad.zip")
  expect(fs.existsSync(zipPath)).toBe(true)

  // kicad/ dir should be removed since --kicad-project was not passed
  const kicadDir = path.join(tmpDir, "dist", "my-board", "kicad")
  expect(fs.existsSync(kicadDir)).toBe(false)

  // zip should contain the expected kicad files
  const zipData = fs.readFileSync(zipPath)
  const zip = await JSZip.loadAsync(zipData)
  const fileNames = Object.keys(zip.files)
  expect(fileNames).toContain("my-board.kicad_sch")
  expect(fileNames).toContain("my-board.kicad_pcb")
  expect(fileNames).toContain("my-board.kicad_pro")
}, 60_000)

test("build --kicad-project writes every hierarchical schematic sheet", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const circuitPath = path.join(tmpDir, "my-board.tsx")
  await writeFile(
    circuitPath,
    `
export default () => (
  <board width="20mm" height="20mm" routingDisabled>
    <schematicsheet name="Sheet 1" displayName="Sheet 1" sheetIndex={0} />
    <schematicsheet name="Sheet 2" displayName="Sheet 2" sheetIndex={1} />
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={3} schSheetName="Sheet 1" />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={-3} schSheetName="Sheet 2" />
  </board>
)
`,
  )

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ type: "module", dependencies: { react: "^19.1.0" } }),
  )

  await runCommand("tsci install")

  const { stderr } = await runCommand(
    `tsci build --kicad-project ${circuitPath}`,
  )
  expect(stderr).toBe("")

  const kicadDir = path.join(tmpDir, "dist", "my-board", "kicad")
  const schFilenames = fs
    .readdirSync(kicadDir)
    .filter((f) => f.endsWith(".kicad_sch"))
    .sort()
  expect(schFilenames).toEqual([
    "my-board.kicad_sch",
    "sheet_1.kicad_sch",
    "sheet_2.kicad_sch",
  ])
}, 60_000)
