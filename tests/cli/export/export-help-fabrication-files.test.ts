import { expect, test } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("export --help explains how to export fabrication files", async () => {
  const { runCommand } = await getCliTestFixture()

  const { stdout, exitCode } = await runCommand("tsci export --help")

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Fabrication files:")
  expect(stdout).toContain("tsci export board.tsx -f gerbers")
  expect(stdout).toContain("bom.csv and pick_and_place.csv")
})
