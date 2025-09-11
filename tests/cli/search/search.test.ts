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
