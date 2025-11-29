import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import "bun-match-svg"

test(
  "tsci add - detects and sets up kicad library from github",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()

    // Create initial package.json (no react needed - CircuitRunner from tscircuit handles it internally)
    await Bun.write(
      join(tmpDir, "package.json"),
      JSON.stringify({
        name: "test-project",
        dependencies: {},
      }),
    )

    // Add a KiCad library from GitHub
    console.log("Adding espressif kicad-libraries...")
    const { stdout } = await runCommand(
      "tsci add https://github.com/espressif/kicad-libraries",
    )

    expect(stdout).toContain(
      "Adding https://github.com/espressif/kicad-libraries",
    )
    expect(stdout).toContain("successfully")

    // Verify package.json was updated
    const pkgJson = JSON.parse(
      await Bun.file(join(tmpDir, "package.json")).text(),
    )
    expect(
      pkgJson.dependencies["kicad-libraries"] ||
        pkgJson.dependencies["espressif/kicad-libraries"],
    ).toBeDefined()

    console.log("✓ Package added to package.json")

    // Verify package was installed in node_modules
    const nodeModulesPath = join(tmpDir, "node_modules", "kicad-libraries")
    expect(existsSync(nodeModulesPath)).toBe(true)

    console.log("✓ Package installed in node_modules")

    // Verify KiCad detection output
    expect(
      stdout.includes("KiCad footprint") || stdout.includes("Detected"),
    ).toBe(true)

    // Verify types directory was created
    const typesDir = join(tmpDir, "types")
    expect(existsSync(typesDir)).toBe(true)

    console.log("✓ Types directory created")

    // Verify types file was generated
    const typeFileName = "kicad-libraries.d.ts"
    const typesFilePath = join(typesDir, typeFileName)

    expect(existsSync(typesFilePath)).toBe(true)

    console.log("✓ Types file generated")

    // Verify types content
    const typesContent = readFileSync(typesFilePath, "utf-8")
    expect(typesContent).toContain('declare module "kicad-libraries/')
    expect(typesContent).toContain(".kicad_mod")
    expect(typesContent).toContain("const value: string")
    expect(typesContent).toContain("export default value")

    console.log("✓ Types file has correct declarations")

    // Verify tsconfig.json was created/updated
    const tsconfigPath = join(tmpDir, "tsconfig.json")
    expect(existsSync(tsconfigPath)).toBe(true)

    const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8"))
    expect(tsconfig.compilerOptions).toBeDefined()
    expect(tsconfig.compilerOptions.typeRoots).toBeDefined()
    expect(tsconfig.compilerOptions.typeRoots).toContain("./types")

    console.log("✓ tsconfig.json configured with types directory")

    console.log("\n✓ All KiCad library detection and setup tests passed!")

    // Now test using the KiCad footprint in a circuit with tsci snapshot
    console.log("\nTesting KiCad footprint usage with tsci snapshot...")

    // Use a specific known footprint file for consistent snapshots across environments
    // The espressif/kicad-libraries repo has this footprint in a known location
    const specificFootprintPath =
      "footprints/Espressif.pretty/ESP32-S2-MINI-1.kicad_mod"
    const kicadModFile = join(
      tmpDir,
      "node_modules",
      "kicad-libraries",
      specificFootprintPath,
    )

    // Verify the footprint file exists
    expect(existsSync(kicadModFile)).toBe(true)
    console.log(`Using KiCad mod file: ${kicadModFile}`)

    // Get the import path from node_modules
    const relativeKicadModPath = `kicad-libraries/${specificFootprintPath}`
    console.log(`Import path: ${relativeKicadModPath}`)

    // Create a circuit file that uses the kicad footprint
    const circuitCode = `
import kicadMod from "${relativeKicadModPath}"

export default () => {
  return (
    <board width="20mm" height="20mm">
      <chip footprint={kicadMod} name="U1" />
    </board>
  )
}
`
    const circuitFilePath = join(tmpDir, "circuit.tsx")
    await Bun.write(circuitFilePath, circuitCode)
    console.log("Created circuit file:", circuitFilePath)
    console.log("Circuit code:", circuitCode)

    // Build the circuit first to ensure it compiles correctly
    console.log("Running tsci build circuit.tsx...")
    const { stdout: buildStdout, stderr: buildStderr } = await runCommand(
      "tsci build circuit.tsx",
    )
    console.log("Build stdout:", buildStdout)
    if (buildStderr) {
      console.log("Build stderr:", buildStderr)
    }
    expect(buildStdout).toContain("Build complete")
    console.log("✓ Circuit build successful")

    // Run tsci snapshot to generate the SVG
    console.log("Running tsci snapshot --pcb-only circuit.tsx...")
    const { stdout: snapshotStdout, stderr: snapshotStderr } = await runCommand(
      "tsci snapshot circuit.tsx --pcb-only",
    )
    console.log("Snapshot stdout:", snapshotStdout)
    if (snapshotStderr) {
      console.log("Snapshot stderr:", snapshotStderr)
    }

    // Check for either "Created snapshots" or "All snapshots match" (when snapshot already exists)
    expect(
      snapshotStdout.includes("Created snapshot") ||
        snapshotStdout.includes("All snapshots match") ||
        snapshotStdout.includes(".snap.svg"),
    ).toBe(true)

    // Verify the snapshot was created
    const snapshotDir = join(tmpDir, "__snapshots__")
    expect(existsSync(snapshotDir)).toBe(true)

    const pcbSnapshotPath = join(snapshotDir, "circuit-pcb.snap.svg")
    expect(existsSync(pcbSnapshotPath)).toBe(true)
    console.log("✓ PCB snapshot created")

    // Read and verify the SVG content
    const pcbSvg = readFileSync(pcbSnapshotPath, "utf-8")
    expect(pcbSvg).toContain("<svg")
    console.log("✓ PCB SVG is valid")

    // Verify the SVG contains footprint content (SMT pads from the kicad_mod file)
    // If the kicad footprint was properly loaded, it should have pcb_smtpad elements
    expect(pcbSvg).toContain("pcb_smtpad")
    console.log("✓ PCB SVG contains SMT pads from KiCad footprint")

    // Use bun-match-svg to snapshot the result
    expect(pcbSvg).toMatchSvgSnapshot(import.meta.path, "kicad-footprint-pcb")
    console.log("✓ PCB SVG matches snapshot")

    console.log("\n✓ KiCad footprint circuit rendering test passed!")
  },
  { timeout: 120_000 },
)
