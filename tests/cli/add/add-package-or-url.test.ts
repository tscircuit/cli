import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import * as fs from "node:fs"

test("tsci add - adds regular npm package", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create initial package.json
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-project",
      dependencies: {},
    }),
  )

  // Test adding a regular npm package
  const { stdout } = await runCommand("tsci add zod")
  expect(stdout).toContain("Adding zod")
  expect(stdout).toContain("successfully")

  // Verify package.json was updated
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["zod"]).toBeDefined()
})

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
})

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

test("tsci add - handles author/component format as tscircuit package", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create initial package.json
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-project",
      dependencies: {},
    }),
  )

  // Test author/component format (should convert to @tsci/author.component)
  const result = await runCommand("tsci add seveibar/soup")

  // Should show it's trying to add @tsci/seveibar.soup
  expect(
    result.stdout.includes("@tsci/seveibar.soup") ||
      result.stderr.includes("@tsci/seveibar.soup"),
  ).toBe(true)
})

test("tsci add - handles scoped packages", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create initial package.json
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-project",
      dependencies: {},
    }),
  )

  // Test adding a scoped package
  const { stdout } = await runCommand("tsci add @types/node")
  expect(stdout).toContain("Adding @types/node")
  expect(stdout).toContain("successfully")

  // Verify package.json was updated
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["@types/node"]).toBeDefined()
})
