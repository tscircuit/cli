import { expect, test } from "bun:test"
import { join } from "node:path"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test(
  "tsci install espressif/kicad-libraries installs GitHub repo and generates types",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()

    // Create initial package.json
    await Bun.write(
      join(tmpDir, "package.json"),
      JSON.stringify({
        name: "test-kicad-project",
        dependencies: {},
      }),
    )

    const { stdout } = await runCommand(
      "tsci install espressif/kicad-libraries",
    )

    // Verify CLI output
    expect(stdout).toContain("Detected GitHub repository")
    expect(stdout).toContain("Installing from github:espressif/kicad-libraries")
    expect(stdout).toContain("Generated type declarations")
    expect(stdout).toContain("Successfully installed espressif/kicad-libraries")

    // Verify package.json was updated
    const packageJson = JSON.parse(
      readFileSync(join(tmpDir, "package.json"), "utf-8"),
    )
    expect(packageJson.dependencies["kicad-libraries"]).toContain(
      "github:espressif/kicad-libraries",
    )

    // Verify node_modules contains the library
    const nodeModulesPath = join(tmpDir, "node_modules", "kicad-libraries")
    expect(existsSync(nodeModulesPath)).toBe(true)

    // Verify footprints directory exists
    const footprintsPath = join(
      nodeModulesPath,
      "footprints",
      "Espressif.pretty",
    )
    expect(existsSync(footprintsPath)).toBe(true)

    // Verify .kicad_mod files exist
    const footprintFiles = readdirSync(footprintsPath)
    const kicadModFiles = footprintFiles.filter((f) => f.endsWith(".kicad_mod"))
    expect(kicadModFiles.length).toBeGreaterThan(0)

    // Verify type declarations were generated
    const typesPath = join(tmpDir, "types", "kicad_mod.d.ts")
    expect(existsSync(typesPath)).toBe(true)

    const typesContent = readFileSync(typesPath, "utf-8")
    expect(typesContent).toContain("declare module")
    expect(typesContent).toContain("*.kicad_mod")

    // Verify bun install reinstalls the library
    const { $ } = Bun
    await $`rm -rf ${join(tmpDir, "node_modules")}`.cwd(tmpDir).quiet()
    expect(existsSync(nodeModulesPath)).toBe(false)

    await $`bun install`.cwd(tmpDir).quiet()
    expect(existsSync(nodeModulesPath)).toBe(true)
    expect(existsSync(footprintsPath)).toBe(true)
  },
  { timeout: 40_000 },
)
