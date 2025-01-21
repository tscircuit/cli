import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"

test.skip("add command installs package and updates .npmrc", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create initial package.json using Bun
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-project",
      dependencies: {},
    }),
  )

  // Run add command
  const { stdout } = await runCommand("tsci add @tsci/example-package")
  expect(stdout).toContain("Added @tsci/example-package")

  // Verify package.json was updated
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["@tsci/example-package"]).toBeDefined()

  // Verify .npmrc was created/updated
  const npmrc = await Bun.file(join(tmpDir, ".npmrc")).text()
  expect(npmrc).toContain("@tsci:registry=https://npm.tscircuit.com")
})
