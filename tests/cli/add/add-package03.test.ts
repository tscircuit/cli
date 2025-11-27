import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"

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
  const { stdout } = await runCommand("tsci add zod@3.22.0")
  expect(stdout).toContain("Adding zod@3.22.0")
  expect(stdout).toContain("successfully")

  // Verify package.json was updated with specific version
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["zod"]).toBe("3.22.0")
})
