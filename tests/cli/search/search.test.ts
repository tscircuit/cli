import { expect, test } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("search command returns jlc results by default", async () => {
  const { runCommand } = await getCliTestFixture()
  const { stdout, stderr } = await runCommand("tsci search 10k")
  // Should not output prompts in test mode
  expect(stderr).toBe("")
  expect(stdout).toContain("JLC search")
  expect(stdout).not.toContain("tscircuit registry")
})
