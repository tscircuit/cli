import { expect, test } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("search command returns kicad footprint results", async () => {
  const { runCommand } = await getCliTestFixture()
  const { stdout, stderr } = await runCommand("tsci search R_0805")
  expect(stderr).toBe("")
  expect(stdout).toContain("KiCad")
  expect(stdout).toMatch(/kicad:.*R_0805/)
})
