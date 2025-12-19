import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, copyFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"

test("export kicad-library generates complete library", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Copy the STEP file from test assets
  const sourceStepPath = path.join(
    __dirname,
    "../assets/SW_Push_1P1T_NO_CK_KMR2.step",
  )
  const stepFilePath = path.join(tmpDir, "SW_Push_1P1T_NO_CK_KMR2.step")
  await copyFile(sourceStepPath, stepFilePath)

  // Create circuit with components and 3D model
  const circuitPath = path.join(tmpDir, "circuit.tsx")
  await writeFile(
    circuitPath,
    `
import stepUrl from "./SW_Push_1P1T_NO_CK_KMR2.step"

export default () => (
  <board width="30mm" height="30mm">
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={5} />
    <capacitor capacitance="100nF" footprint="0603" name="C1" pcbX={-5} />
    <chip name="U1" footprint="soic8" pcbY={5} cadModel={<cadmodel modelUrl={stepUrl} />} />
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

  // Read the generated zip
  const zipPath = path.join(tmpDir, "circuit-kicad-library.zip")
  const zip = await JSZip.loadAsync(await readFile(zipPath))
  const files = Object.keys(zip.files)

  // Verify symbol library
  expect(files).toContain("circuit.kicad_sym")
  const symContent = await zip.file("circuit.kicad_sym")!.async("string")
  expect(symContent).toContain("kicad_symbol_lib")
  // Verify symbol references correct footprint library (same name as project)
  expect(symContent).toContain('"circuit:')

  // Verify footprint library (uses same name as project: "circuit")
  expect(files.some((f) => f.includes("circuit.pretty/"))).toBe(true)
  expect(
    files.filter((f) => f.endsWith(".kicad_mod")).length,
  ).toBeGreaterThanOrEqual(3)

  // Verify chip footprint has 3D model reference
  const chipContent = await zip
    .file("circuit.pretty/simple_chip.kicad_mod")!
    .async("string")
  expect(chipContent).toContain("(model")
  expect(chipContent).toContain("SW_Push_1P1T_NO_CK_KMR2.step")

  // Verify 3D model file is included
  expect(files).toContain("circuit.3dshapes/SW_Push_1P1T_NO_CK_KMR2.step")

  // Verify library tables
  expect(files).toContain("fp-lib-table")
  expect(files).toContain("sym-lib-table")

  // Save to debug-output for inspection
  const debugOutputDir = path.join(__dirname, "../../../debug-output")
  await import("node:fs/promises").then((fs) =>
    fs.mkdir(debugOutputDir, { recursive: true }),
  )
  await copyFile(zipPath, path.join(debugOutputDir, "circuit-kicad-library.zip"))
  console.log("Saved to debug-output/circuit-kicad-library.zip")
}, 120_000)
