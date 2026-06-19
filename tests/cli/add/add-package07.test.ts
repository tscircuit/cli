import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import { existsSync } from "node:fs"

test("tsci add - adds multiple packages in a single command", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-project",
      dependencies: {},
    }),
  )

  const { stdout } = await runCommand("tsci add @tsci/seveibar.Key @tsci/seveibar.PICO")
  expect(stdout).toContain("Adding @tsci/seveibar.Key @tsci/seveibar.PICO")
  expect(stdout).toContain("successfully")

  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["@tsci/seveibar.Key"]).toBeDefined()
  expect(pkgJson.dependencies["@tsci/seveibar.PICO"]).toBeDefined()

  expect(existsSync(join(tmpDir, "node_modules", "@tsci", "seveibar.Key"))).toBe(true)
  expect(existsSync(join(tmpDir, "node_modules", "@tsci", "seveibar.PICO"))).toBe(true)
})
