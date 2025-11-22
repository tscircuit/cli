import { expect, test } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import { mkdir } from "node:fs/promises"

test(
  "tsci install - install kicad library from github and verify setup",
  async () => {
    const fixture = await getCliTestFixture()

    // Install the espressif kicad-libraries repository
    console.log("Installing espressif kicad-libraries...")
    await fixture.runCommand(
      "tsci install https://github.com/espressif/kicad-libraries",
    )

    // Verify package.json was created and has the dependency
    const packageJsonPath = join(fixture.tmpDir, "package.json")
    expect(fs.existsSync(packageJsonPath)).toBe(true)

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
    expect(packageJson.dependencies).toBeDefined()
    expect(
      packageJson.dependencies["kicad-libraries"] ||
        packageJson.dependencies["espressif/kicad-libraries"],
    ).toBeDefined()

    console.log("✓ Package.json created with kicad-libraries dependency")

    // Verify types file was generated
    const typesPath = join(fixture.tmpDir, "types", "kicad-libraries.d.ts")
    expect(fs.existsSync(typesPath)).toBe(true)

    const typesContent = fs.readFileSync(typesPath, "utf-8")
    expect(typesContent).toContain('declare module "kicad-libraries/')
    expect(typesContent).toContain(".kicad_mod")

    console.log("✓ Types file generated for kicad modules")

    // Verify the node_modules directory contains the kicad library
    const nodeModulesPath = join(
      fixture.tmpDir,
      "node_modules",
      "kicad-libraries",
    )
    expect(fs.existsSync(nodeModulesPath)).toBe(true)

    // Find .kicad_mod files in the installed package
    const globbySync = (await import("globby")).globbySync
    const kicadModFiles = globbySync(["**/*.kicad_mod"], {
      cwd: nodeModulesPath,
      absolute: false,
    })

    expect(kicadModFiles.length).toBeGreaterThan(0)
    console.log(`✓ Found ${kicadModFiles.length} .kicad_mod files`)

    // Verify that one of the types declarations matches an actual file
    const firstKicadModPath = kicadModFiles[0]
    const expectedDeclaration = `declare module "kicad-libraries/${firstKicadModPath}"`
    expect(typesContent).toContain(expectedDeclaration)

    console.log(`✓ Type declaration exists for ${firstKicadModPath}`)

    // Verify tsconfig.json was created/updated
    const tsconfigPath = join(fixture.tmpDir, "tsconfig.json")
    expect(fs.existsSync(tsconfigPath)).toBe(true)

    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"))
    expect(tsconfig.compilerOptions).toBeDefined()
    expect(tsconfig.compilerOptions.typeRoots).toContain("./types")

    console.log("✓ tsconfig.json configured with types directory")

    // Create a circuit file that imports and uses the kicad footprint
    // Note: The footprint string will be available but full parsing to PCB elements
    // happens in the viewer/runframe environment with kicad-component-converter
    const circuitContent = `import kicadFootprint from "kicad-libraries/${firstKicadModPath}"

export default () => (
  <board width="50mm" height="50mm">
    <chip footprint={kicadFootprint} name="U1" pcbX={0} pcbY={0} />
  </board>
)
`
    await Bun.write(join(fixture.tmpDir, "test.circuit.tsx"), circuitContent)

    console.log("✓ Created test circuit file importing KiCad footprint")

    // Verify the import works by checking the module can be resolved
    const testImportPath = join(
      fixture.tmpDir,
      "node_modules",
      "kicad-libraries",
      firstKicadModPath,
    )
    expect(fs.existsSync(testImportPath)).toBe(true)
    const kicadModContent = fs.readFileSync(testImportPath, "utf-8")
    expect(kicadModContent).toContain("footprint")
    console.log(
      `✓ KiCad footprint file is accessible and contains footprint data`,
    )

    // Build the circuit
    console.log("Building circuit...")
    await fixture.runCommand("tsci build test.circuit.tsx")

    // Verify circuit.json was generated
    const circuitJsonPath = join(fixture.tmpDir, "dist", "test", "circuit.json")
    expect(fs.existsSync(circuitJsonPath)).toBe(true)

    const circuitJson = JSON.parse(fs.readFileSync(circuitJsonPath, "utf-8"))
    console.log(`✓ Circuit JSON generated with ${circuitJson.length} elements`)

    // Verify that the circuit has chip components
    const sourceComponents = circuitJson.filter(
      (elem: any) => elem.type === "source_component",
    )
    expect(sourceComponents.length).toBeGreaterThan(0)
    console.log(
      `✓ Found ${sourceComponents.length} source_component(s) with KiCad footprint`,
    )

    // Generate PCB snapshot
    console.log("Generating PCB snapshot...")
    await fixture.runCommand("tsci snapshot test.circuit.tsx")

    // Verify snapshot was created
    const snapshotDir = join(fixture.tmpDir, "__snapshots__")
    expect(fs.existsSync(snapshotDir)).toBe(true)

    const snapshotFiles = fs.readdirSync(snapshotDir)
    const pcbSnapshotFile = snapshotFiles.find((f) => f.includes("pcb"))
    expect(pcbSnapshotFile).toBeDefined()

    console.log(`✓ PCB snapshot generated: ${pcbSnapshotFile}`)

    // Copy snapshot to test directory for persistence
    const testSnapshotDir = join(__dirname, "__snapshots__")
    await mkdir(testSnapshotDir, { recursive: true })

    const snapshotSourcePath = join(snapshotDir, pcbSnapshotFile!)
    const snapshotDestPath = join(
      testSnapshotDir,
      "kicad-library-install-pcb.svg",
    )
    fs.copyFileSync(snapshotSourcePath, snapshotDestPath)

    console.log(`✓ Snapshot saved to ${snapshotDestPath}`)

    console.log("\n✓ All install verification tests passed!")
    console.log("\nThe user can now use the installed library by importing:")
    console.log(
      `  import footprint from "kicad-libraries/${firstKicadModPath}"`,
    )

    // Cleanup
    globalThis.deferredCleanupFns.push(async () => {
      // Cleanup is handled by fixture
    })
  },
  { timeout: 60_000 },
)
