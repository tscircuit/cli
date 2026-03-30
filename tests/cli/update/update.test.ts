import { expect, test } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("update command updates a specific package", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-update-single",
      dependencies: {
        "@tscircuit/math-utils": "0.0.1",
      },
    }),
  )

  const { stdout, exitCode } = await runCommand("tsci update @tscircuit/math-utils")

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Updating @tscircuit/math-utils...")
  expect(stdout).toContain("Updated @tscircuit/math-utils successfully")
}, { timeout: 30_000 })

test("update command automatically targets all tscircuit packages when no argument is passed", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-update-all",
      dependencies: {
        "@tscircuit/math-utils": "0.0.1",
        "@tscircuit/props": "0.0.1"
      },
      devDependencies: {
        "typescript": "^5.0.0" 
      }
    }),
  )

  const { stdout, exitCode } = await runCommand("tsci update")

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Updating 2 packages:")
  expect(stdout).toContain("@tscircuit/math-utils @tscircuit/props")
  expect(stdout).toContain("Updated all tscircuit packages successfully")
}, { timeout: 30_000 })

test("update command handles missing package.json gracefully", async () => {
  const { runCommand } = await getCliTestFixture()

  const { stdout } = await runCommand("tsci update")

  expect(stdout).toContain("No package.json found. Cannot update all packages.")
})
