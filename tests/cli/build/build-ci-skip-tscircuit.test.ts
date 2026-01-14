import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

test("build --ci with alwaysUseLatestTscircuitOnCloud removes tscircuit from package.json before install", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      alwaysUseLatestTscircuitOnCloud: true,
      buildCommand: "node -e \"console.log('build complete')\"",
    }),
  )

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-skip-tscircuit",
      version: "1.0.0",
      dependencies: {
        tscircuit: "^0.0.100",
        lodash: "^4.17.21",
      },
    }),
  )

  const { stdout } = await runCommand("tsci build --ci")

  expect(stdout).toContain(
    "\nSkipping tscircuit package installation (using cloud container version).",
  )

  // Verify package.json was modified to remove tscircuit
  const packageJson = JSON.parse(
    await readFile(path.join(tmpDir, "package.json"), "utf-8"),
  )
  expect(packageJson.dependencies.tscircuit).toBeUndefined()
  expect(packageJson.dependencies.lodash).toBe("^4.17.21")
}, 60_000)
