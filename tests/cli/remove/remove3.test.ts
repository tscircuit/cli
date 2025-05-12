import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { addDependency } from "./add-dependency"
import { join } from "node:path"

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
  expect(pkgJson.dependencies?.["@tsci/another.component"]).toBeUndefined()
})
