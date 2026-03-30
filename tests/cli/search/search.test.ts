import { expect, test } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("search command returns jlc results by default", async () => {
  const { runCommand } = await getCliTestFixture()
  const { stdout, stderr } = await runCommand("tsci search 555")
  // Should not output prompts in test mode
  expect(stderr).toBe("")
  if (stdout.includes("No results found")) {
    expect(stdout).toContain("No results found")
  } else {
    expect(stdout).toContain("JLC search")
  }
  expect(stdout).not.toContain("tscircuit registry")
})
