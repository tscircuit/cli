import { expect, test } from "bun:test"
import fs from "node:fs"
import { copyFile, readdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("build kicad-project with builtin and custom 3D models", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Copy the STEP file from test assets for custom 3D model
  const sourceStepPath = path.join(
    __dirname,
    "../assets/SW_Push_1P1T_NO_CK_KMR2.step",
  )
  const stepFilePath = path.join(tmpDir, "SW_Push_1P1T_NO_CK_KMR2.step")
  await copyFile(sourceStepPath, stepFilePath)

  const circuitPath = path.join(tmpDir, "my-board.tsx")
  await writeFile(
    circuitPath,
    `
import stepUrl from "./SW_Push_1P1T_NO_CK_KMR2.step"

export default () => (
  <board width="30mm" height="20mm">
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-5} />
    <capacitor capacitance="100nF" footprint="0603" name="C1" pcbX={5} />
    <chip name="U1" footprint="soic8" pcbY={5} cadModel={<cadmodel modelUrl={stepUrl} stepUrl={stepUrl}/>} />
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

  const projectDir = path.join(tmpDir, "dist", "my-board", "kicad")
  expect(fs.existsSync(projectDir)).toBe(true)

  // Verify builtin .step files were fetched from CDN
  const builtinShapesDir = path.join(
    projectDir,
    "3dmodels/tscircuit_builtin.3dshapes",
  )
  expect(fs.existsSync(builtinShapesDir)).toBe(true)
  const builtinSteps = (await readdir(builtinShapesDir)).sort()
  expect(builtinSteps).toMatchInlineSnapshot(`
    [
      "0603.step",
      "res0402.step",
    ]
  `)

  // Verify custom .step file was copied (project name comes from filename)
  const customShapesDir = path.join(projectDir, "3dmodels/my-board.3dshapes")
  expect(fs.existsSync(customShapesDir)).toBe(true)
  const customSteps = await readdir(customShapesDir)
  expect(customSteps).toMatchInlineSnapshot(`
    [
      "SW_Push_1P1T_NO_CK_KMR2.step",
    ]
  `)

  // Verify the .kicad_pcb references KIPRJMOD paths
  const pcbContent = fs.readFileSync(
    path.join(projectDir, "my-board.kicad_pcb"),
    "utf-8",
  )
  expect(pcbContent).toContain(
    "${KIPRJMOD}/3dmodels/tscircuit_builtin.3dshapes/res0402.step",
  )
  expect(pcbContent).toContain(
    "${KIPRJMOD}/3dmodels/my-board.3dshapes/SW_Push_1P1T_NO_CK_KMR2.step",
  )

  // Verify all step files are non-empty
  for (const dir of [builtinShapesDir, customShapesDir]) {
    for (const file of await readdir(dir)) {
      const stats = await stat(path.join(dir, file))
      expect(stats.size).toBeGreaterThan(0)
    }
  }
}, 120_000)
