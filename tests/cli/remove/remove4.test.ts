import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { addDependency } from "./add-dependency"
import { join } from "node:path"

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