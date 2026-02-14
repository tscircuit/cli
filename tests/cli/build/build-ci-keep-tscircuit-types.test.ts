import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("build --ci keeps tscircuit in devDependencies", async () => {
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
      name: "test-keep-tscircuit-types",
      version: "1.0.0",
      dependencies: {
        tscircuit: "^0.0.100",
        lodash: "^4.17.21",
      },
      devDependencies: {
        tscircuit: "^0.0.101",
      },
    }),
  )

  const { stdout } = await runCommand("tsci build --ci")

  expect(stdout).toContain(
    "\nSkipping tscircuit package installation from dependencies (using cloud container version).",
  )

  const packageJson = JSON.parse(
    await readFile(path.join(tmpDir, "package.json"), "utf-8"),
  )

  expect(packageJson.dependencies.tscircuit).toBeUndefined()
  expect(packageJson.dependencies.lodash).toBe("^4.17.21")
  expect(packageJson.devDependencies.tscircuit).toBe("^0.0.101")
}, 60_000)
