import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, copyFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"

test("export kicad zip includes user 3d models", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const sourceStepPath = path.join(
    __dirname,
    "../assets/SW_Push_1P1T_NO_CK_KMR2.step",
  )
  const stepFilePath = path.join(tmpDir, "SW_Push_1P1T_NO_CK_KMR2.step")
  await copyFile(sourceStepPath, stepFilePath)

  const circuitPath = path.join(tmpDir, "test-circuit.tsx")
  await writeFile(
    circuitPath,
    `
import stepUrl from "./SW_Push_1P1T_NO_CK_KMR2.step"

export default () => (
  <board width="30mm" height="20mm">
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-5} />
    <chip name="U1" footprint="soic8" pcbY={5} cadModel={<cadmodel modelUrl={stepUrl} stepUrl={stepUrl} />} />
  </board>
)
`,
  )

  const { stderr } = await runCommand(`tsci export ${circuitPath} -f kicad_zip`)
  expect(stderr).toBe("")

  const zipBuffer = await readFile(path.join(tmpDir, "test-circuit-kicad.zip"))
  const zip = await JSZip.loadAsync(zipBuffer)

  const allFiles = Object.keys(zip.files).filter((f) => !f.endsWith("/"))

  // Builtin model fetched from CDN
  expect(allFiles).toContain("3dmodels/tscircuit_builtin.3dshapes/0402.step")

  // User model copied from local path
  expect(allFiles).toContain(
    "3dmodels/test-circuit.3dshapes/SW_Push_1P1T_NO_CK_KMR2.step",
  )

  // Both files should have non-zero content
  for (const f of [
    "3dmodels/tscircuit_builtin.3dshapes/0402.step",
    "3dmodels/test-circuit.3dshapes/SW_Push_1P1T_NO_CK_KMR2.step",
  ]) {
    const content = await zip.files[f].async("nodebuffer")
    expect(content.length).toBeGreaterThan(0)
  }
}, 60_000)
