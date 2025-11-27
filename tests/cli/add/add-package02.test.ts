import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import { existsSync } from "node:fs"

test("tsci add - adds package from GitHub URL", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create initial package.json
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-project",
      dependencies: {},
    }),
  )

  // Test adding from GitHub URL
  const { stdout } = await runCommand(
    "tsci add https://github.com/lodash/lodash",
  )
  expect(stdout).toContain("Adding https://github.com/lodash/lodash")
  expect(stdout).toContain("successfully")

  // Verify package.json was updated
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["lodash"]).toBeDefined()

  // Verify package was actually installed in node_modules
  const nodeModulesPath = join(tmpDir, "node_modules", "lodash")
  expect(existsSync(nodeModulesPath)).toBe(true)
})
