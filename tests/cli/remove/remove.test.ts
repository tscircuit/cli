import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"

// Helper to add a dependency to package.json
async function addDependency(tmpDir: string, dep: string) {
  const pkgJsonPath = join(tmpDir, "package.json")
  const pkgJson = JSON.parse(await Bun.file(pkgJsonPath).text())
  pkgJson.dependencies = pkgJson.dependencies || {}
  pkgJson.dependencies[dep] = "^1.0.0"
  await Bun.write(pkgJsonPath, JSON.stringify(pkgJson, null, 2))
}

test("remove command deletes @tsci scoped package from package.json", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-project", dependencies: {} }),
  )
  await addDependency(tmpDir, "@tsci/example-package")
  const { stdout } = await runCommand("tsci remove @tsci/example-package")
  expect(stdout).toContain("Removing @tsci/example-package")
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["@tsci/example-package"]).toBeUndefined()
})

test("remove command deletes author/component format from package.json", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-project", dependencies: {} }),
  )
  await addDependency(tmpDir, "@tsci/author.component-name")
  const { stdout } = await runCommand("tsci remove author/component-name")
  expect(stdout).toContain("Removing @tsci/author.component-name")
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["@tsci/author.component-name"]).toBeUndefined()
})

test("remove command deletes author.component format from package.json", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-project", dependencies: {} }),
  )
  await addDependency(tmpDir, "@tsci/another.component")
  const { stdout } = await runCommand("tsci remove another.component")
  expect(stdout).toContain("Removing @tsci/another.component")
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["@tsci/another.component"]).toBeUndefined()
})

test("remove command deletes @tscircuit scoped package from package.json", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-project", dependencies: {} }),
  )
  await addDependency(tmpDir, "@tscircuit/example")
  const { stdout } = await runCommand("tsci remove @tscircuit/example")
  expect(stdout).toContain("Removing @tscircuit/example")
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["@tscircuit/example"]).toBeUndefined()
})

test("remove command handles non-existent package gracefully", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-project", dependencies: {} }),
  )
  const { stdout } = await runCommand("tsci remove @tsci/not-present")
  expect(stdout).toContain("@tsci/not-present is not a dependency.")
})
