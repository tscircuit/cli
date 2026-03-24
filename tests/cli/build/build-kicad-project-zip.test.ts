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
