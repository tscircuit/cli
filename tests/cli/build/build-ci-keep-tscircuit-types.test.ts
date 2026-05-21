import { expect, test } from "bun:test"
import { mkdir, readFile, writeFile } from "node:fs/promises"
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

  await mkdir(path.join(tmpDir, "local-lodash"), { recursive: true })
  await mkdir(path.join(tmpDir, "local-tscircuit"), { recursive: true })
  await writeFile(
    path.join(tmpDir, "local-lodash", "package.json"),
    JSON.stringify({ name: "lodash", version: "4.17.21" }),
  )
  await writeFile(
    path.join(tmpDir, "local-tscircuit", "package.json"),
    JSON.stringify({ name: "tscircuit", version: "0.0.101" }),
  )

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-keep-tscircuit-types",
      version: "1.0.0",
      dependencies: {
        tscircuit: "^0.0.100",
        lodash: "file:./local-lodash",
      },
      devDependencies: {
        tscircuit: "file:./local-tscircuit",
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
  expect(packageJson.dependencies.lodash).toBe("file:./local-lodash")
  expect(packageJson.devDependencies.tscircuit).toBe("file:./local-tscircuit")
}, 60_000)
