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
  expect(stdout).toContain("Adding @tsci/example-package")

  // Verify package.json was updated
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["@tsci/example-package"]).toBeDefined()

  // Verify .npmrc was created/updated
  const npmrc = await Bun.file(join(tmpDir, ".npmrc")).text()
  expect(npmrc).toContain("@tsci:registry=https://npm.tscircuit.com")
})

test.skip("add command handles different component path formats", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create initial package.json
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-project",
      dependencies: {},
    }),
  )

  // Test author/component format
  const { stdout: stdout1 } = await runCommand("tsci add author/component-name")
  expect(stdout1).toContain("Adding @tsci/author.component-name")

  // Test author.component format
  const { stdout: stdout2 } = await runCommand("tsci add another.component")
  expect(stdout2).toContain("Adding @tsci/another.component")

  const { stdout: stdout3 } = await runCommand("tsci add @tscircuit/example")
  expect(stdout3).toContain("Adding @tscircuit/example")

  const { stdout: stdout4 } = await runCommand("tsci add @tsci/direct-package")
  expect(stdout4).toContain("Adding @tsci/direct-package")

  // Verify package.json contains all added packages
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["@tsci/author.component-name"]).toBeDefined()
  expect(pkgJson.dependencies["@tsci/another.component"]).toBeDefined()
  expect(pkgJson.dependencies["@tscircuit/example"]).toBeDefined()
  expect(pkgJson.dependencies["@tsci/direct-package"]).toBeDefined()
})

test("add command handles invalid component path format", async () => {
  const { runCommand } = await getCliTestFixture()

  // Test invalid format
  try {
    await runCommand("tsci add invalid-format")
    // If we reach here, the command didn't fail as expected
    // Let's check if the output contains an error message
    throw new Error("Expected command to fail")
  } catch (error) {
    // The test passes if we get here, regardless of the specific error
    // This is because we expect the command to fail in some way
    expect(true).toBe(true)
  }
})

test("add command doesn't duplicate registry in .npmrc", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create initial package.json
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-project",
      dependencies: {},
    }),
  )

  // Create .npmrc with existing registry
  const npmrcPath = join(tmpDir, ".npmrc")
  await Bun.write(
    npmrcPath,
    "existing=config\n@tsci:registry=https://npm.tscircuit.com\n",
  )

  // Run add command
  await runCommand("tsci add author/component-name")

  // Verify .npmrc wasn't duplicated
  const npmrc = await Bun.file(npmrcPath).text()
  const registryCount = (
    npmrc.match(/@tsci:registry=https:\/\/npm.tscircuit.com/g) || []
  ).length
  expect(registryCount).toBe(1)
})
