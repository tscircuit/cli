import { expect, test } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("search --kicad only returns kicad footprint results", async () => {
  const { runCommand } = await getCliTestFixture()
  const { stdout, stderr } = await runCommand("tsci search --kicad R_0805")
  expect(stderr).toBe("")
  expect(stdout).toContain("KiCad")
  expect(stdout).toMatch(/R_0805/)
  expect(stdout).not.toContain("tscircuit registry")
  expect(stdout).not.toContain("JLC search")
})
