import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"

test(
  "tsci add - detects and sets up kicad library from github",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()

    // Create initial package.json
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

    // Find a kicad_mod file to use in the test
    const kicadModFiles = typesContent.match(
      /declare module "kicad-libraries\/([^"]+\.kicad_mod)"/g,
    )
    expect(kicadModFiles).toBeDefined()
    expect(kicadModFiles!.length).toBeGreaterThan(0)

    // Extract the first kicad_mod file path
    const firstKicadModMatch = kicadModFiles![0].match(
      /declare module "kicad-libraries\/([^"]+\.kicad_mod)"/,
    )
    const kicadModPath = firstKicadModMatch![1]
    console.log(`✓ Found kicad_mod file to use: ${kicadModPath}`)

    // Step 4: Create a circuit that uses the kicad_mod file
    const circuitContent = `import kicadFootprint from "kicad-libraries/${kicadModPath}"
    
    export default () => (
      <board width="30mm" height="30mm">
        <chip
          name="U1"
          footprint={kicadFootprint}
          pcbX={0}
          pcbY={0}
        />
      </board>
    )
    `

    const circuitFilePath = join(tmpDir, "circuit.tsx")
    writeFileSync(circuitFilePath, circuitContent)
    console.log("✓ Circuit file created: circuit.tsx")

    const { stdout: buildStdout, stderr: buildStderr } = await runCommand(
      "tsci build circuit.tsx",
    )

    console.log("Build output:", buildStdout)
    expect(buildStdout).toContain("Generating circuit JSON")
    expect(buildStderr).not.toContain("error")
    expect(buildStderr).not.toContain("Error")
    console.log("✓ Circuit built successfully")

    // Step 6: Generate and verify PCB snapshot

    // Create snapshots directory in the test temp directory
    const snapshotsDir = join(tmpDir, "__snapshots__")
    mkdirSync(snapshotsDir, { recursive: true })

    // Run snapshot command to generate PCB SVG
    const { stdout: snapshotStdout, stderr: snapshotStderr } = await runCommand(
      "tsci snapshot circuit.tsx --pcb-only",
    )

    console.log("Snapshot output:", snapshotStdout)
    expect(snapshotStdout).toContain("snapshot")
    expect(snapshotStderr).not.toContain("error")

    // Verify snapshot was created in temp directory
    const tempSnapshotPath = join(snapshotsDir, "circuit-pcb.snap.svg")
    expect(existsSync(tempSnapshotPath)).toBe(true)
    console.log(`✓ PCB snapshot generated at: ${tempSnapshotPath}`)

    // Copy snapshot to tests/cli/add/__snapshots__
    const testSnapshotDir = join(__dirname, "__snapshots__")
    mkdirSync(testSnapshotDir, { recursive: true })
    const testSnapshotPath = join(
      testSnapshotDir,
      "add-kicad-library-pcb.snap.svg",
    )

    const pcbSvg = readFileSync(tempSnapshotPath, "utf-8")
    writeFileSync(testSnapshotPath, pcbSvg)
    console.log(`✓ PCB snapshot saved to: ${testSnapshotPath}`)

    // Verify snapshot contains expected elements
    expect(pcbSvg).toContain("<svg")
    expect(pcbSvg).toContain("</svg>")

    // Verify the circuit JSON has PCB elements
    const circuitJsonPath = join(tmpDir, "dist", "circuit", "circuit.json")
    expect(existsSync(circuitJsonPath)).toBe(true)

    const circuitJson = JSON.parse(readFileSync(circuitJsonPath, "utf-8"))
    expect(Array.isArray(circuitJson)).toBe(true)
    expect(circuitJson.length).toBeGreaterThan(0)

    // Verify we have PCB board
    const hasPcbBoard = circuitJson.some(
      (elem: any) => elem.type === "pcb_board",
    )
    expect(hasPcbBoard).toBe(true)

    // Verify we have some PCB elements (components, traces, etc.)
    const hasPcbElements = circuitJson.some((elem: any) =>
      elem.type?.startsWith("pcb_"),
    )
    expect(hasPcbElements).toBe(true)

    console.log("✓ PCB snapshot verified")

    console.log("\n✓ All KiCad library detection and setup tests passed!")
  },
  { timeout: 90_000 },
)
