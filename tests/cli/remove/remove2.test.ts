import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { addDependency } from "./add-dependency"
import { join } from "node:path"

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
  expect(pkgJson.dependencies?.["@tsci/author.component-name"]).toBeUndefined()
})
