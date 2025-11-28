import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import { existsSync, readFileSync } from "node:fs"

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

    expect(stdout).toContain("Adding https://github.com/espressif/kicad-libraries")
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
  },
  { timeout: 90_000 },
)
