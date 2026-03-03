import { expect, test } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("init -y skips update check entirely", async () => {
  const { runCommand } = await getCliTestFixture()

  const projectDir = "test-project"
  const { stdout, exitCode } = await runCommand(
    `tsci init ${projectDir} -y --no-install`,
  )

  // Should not show any update-related output
  expect(stdout).not.toContain("Would you like to update now?")
  expect(stdout).not.toContain("Updating tsci using:")
  expect(stdout).not.toContain("new version")

  // Should complete init successfully
  expect(stdout).toContain("Initialization complete!")
  expect(exitCode).toBe(0)
}, 30_000)
