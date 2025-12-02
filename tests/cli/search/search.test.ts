import { expect, test } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("search command returns registry and jlc results", async () => {
  const { runCommand } = await getCliTestFixture()
  const { stdout, stderr } = await runCommand("tsci search 555")
  // Should not output prompts in test mode
  expect(stderr).toBe("")
  expect(stdout).toContain("tscircuit registry")
  expect(stdout).toContain("JLC search")
  expect(stdout.toLowerCase()).toContain("stars")
})

test("search shows latest package version when version is missing", async () => {
  const { runCommand } = await getCliTestFixture()
  const { stdout, stderr } = await runCommand("tsci search 555")

  expect(stderr).toBe("")
  expect(stdout).toContain("v0.0.1")
  expect(stdout).not.toContain("vundefined")
})
