import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import { existsSync } from "node:fs"

test("tsci add - adds package with version", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create initial package.json
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-project",
      dependencies: {},
    }),
  )

  // Test adding with version
  const { stdout } = await runCommand("tsci add is-number@6")
  expect(stdout).toContain("Adding is-number@6")
  expect(stdout).toContain("successfully")

  // Verify package.json was updated with specific version
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["is-number"]).toBe("6")

  // Verify package was actually installed in node_modules
  const nodeModulesPath = join(tmpDir, "node_modules", "is-number")
  expect(existsSync(nodeModulesPath)).toBe(true)
})
