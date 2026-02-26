import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, readdir, stat, copyFile } from "node:fs/promises"
import path from "node:path"
import fs from "node:fs"
import JSZip from "jszip"

test("export kicad-library with builtin and custom 3D models, then zip", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Copy the STEP file from test assets for custom 3D model
  const sourceStepPath = path.join(
    __dirname,
    "../assets/SW_Push_1P1T_NO_CK_KMR2.step",
  )
  const stepFilePath = path.join(tmpDir, "SW_Push_1P1T_NO_CK_KMR2.step")
  await copyFile(sourceStepPath, stepFilePath)

  const circuitPath = path.join(tmpDir, "index.tsx")
  await writeFile(
    circuitPath,
    `
import stepUrl from "./SW_Push_1P1T_NO_CK_KMR2.step"

export default () => (
  <board width="30mm" height="20mm">
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-5} />
    <capacitor capacitance="100nF" footprint="0603" name="C1" pcbX={5} />
    <chip name="U1" footprint="soic8" pcbY={5} cadModel={<cadmodel modelUrl={stepUrl}  stepUrl={stepUrl}/>} />
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
    `tsci export ${circuitPath} -f kicad-library`,
  )
  expect(stderr).toBe("")

  const libDir = path.join(tmpDir, "index")
  expect(fs.existsSync(libDir)).toBe(true)

  // Verify builtin .step files were fetched from CDN
  const builtinShapesDir = path.join(
    libDir,
    "3dmodels/tscircuit_builtin.3dshapes",
  )
  expect(fs.existsSync(builtinShapesDir)).toBe(true)
  const builtinSteps = (await readdir(builtinShapesDir)).sort()
  expect(builtinSteps).toMatchInlineSnapshot(`
    [
      "0402.step",
      "0603.step",
    ]
  `)

  // Verify custom .step file was copied
  const customShapesDir = path.join(libDir, "3dmodels/index.3dshapes")
  expect(fs.existsSync(customShapesDir)).toBe(true)
  const customSteps = await readdir(customShapesDir)
  expect(customSteps).toMatchInlineSnapshot(`
    [
      "SW_Push_1P1T_NO_CK_KMR2.step",
    ]
  `)

  // Verify all step files are non-empty
  for (const dir of [builtinShapesDir, customShapesDir]) {
    for (const file of await readdir(dir)) {
      const stats = await stat(path.join(dir, file))
      expect(stats.size).toBeGreaterThan(0)
    }
  }

  // Zip the entire library output
  const zip = new JSZip()

  const addDirToZip = async (dirPath: string, zipPrefix: string) => {
    const entries = await readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      const zipPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        await addDirToZip(fullPath, zipPath)
      } else {
        const content = await readFile(fullPath)
        zip.file(zipPath, content)
      }
    }
  }

  await addDirToZip(libDir, "")

  const zipPaths = Object.keys(zip.files).sort()
  // expect(zipPaths).toMatchInlineSnapshot(`
  //   [
  //     "3dmodels/",
  //     "3dmodels/index.3dshapes/",
  //     "3dmodels/index.3dshapes/SW_Push_1P1T_NO_CK_KMR2.step",
  //     "3dmodels/tscircuit_builtin.3dshapes/",
  //     "3dmodels/tscircuit_builtin.3dshapes/0402.step",
  //     "3dmodels/tscircuit_builtin.3dshapes/0603.step",
  //     "footprints/",
  //     "footprints/index.pretty/",
  //     "footprints/index.pretty/MyCircuit.kicad_mod",
  //     "footprints/tscircuit_builtin.pretty/",
  //     "footprints/tscircuit_builtin.pretty/capacitor_0603.kicad_mod",
  //     "footprints/tscircuit_builtin.pretty/resistor_0402.kicad_mod",
  //     "fp-lib-table",
  //     "sym-lib-table",
  //     "symbols/",
  //     "symbols/index.kicad_sym",
  //     "symbols/tscircuit_builtin.kicad_sym",
  //   ]
  // `)

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })
  const zipOutPath = path.join(
    "/Users/mustafamulla/Desktop",
    "kicad-builtin-3d-test.zip",
  )
  fs.writeFileSync(zipOutPath, zipBuffer)
  console.log(`\nZip saved to: ${zipOutPath}`)
}, 120_000)
