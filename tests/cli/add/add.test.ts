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

test.skip("add command handles author/component format", async () => {
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
  const { stdout } = await runCommand("tsci add author/component-name")
  expect(stdout).toContain("Adding @tsci/author.component-name")

  // Verify package.json was updated
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["@tsci/author.component-name"]).toBeDefined()
})

test.skip("add command handles author.component format", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create initial package.json
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-project",
      dependencies: {},
    }),
  )

  // Test author.component format
  const { stdout } = await runCommand("tsci add another.component")
  expect(stdout).toContain("Adding @tsci/another.component")

  // Verify package.json was updated
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["@tsci/another.component"]).toBeDefined()
})

test.skip("add command handles @tscircuit scoped package", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create initial package.json
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-project",
      dependencies: {},
    }),
  )

  // Test direct @tscircuit scoped package
  const { stdout } = await runCommand("tsci add @tscircuit/example")
  expect(stdout).toContain("Adding @tscircuit/example")

  // Verify package.json was updated
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["@tscircuit/example"]).toBeDefined()
})

test.skip("add command handles @tsci scoped package", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create initial package.json
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-project",
      dependencies: {},
    }),
  )

  // Test direct @tsci scoped package
  const { stdout } = await runCommand("tsci add @tsci/direct-package")
  expect(stdout).toContain("Adding @tsci/direct-package")

  // Verify package.json was updated
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["@tsci/direct-package"]).toBeDefined()
})

test.skip("add command doesn't duplicate registry in .npmrc", async () => {
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
