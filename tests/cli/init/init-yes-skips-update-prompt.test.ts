import { expect, test } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("init -y skips update prompt when newer version is available", async () => {
  const { runCommand } = await getCliTestFixture()

  const projectDir = "test-project"
  const { stdout, exitCode } = await runCommand(
    `tsci init ${projectDir} -y --no-install`,
    { env: { TSCI_FAKE_LATEST_VERSION: "99.99.99" } },
  )

  // Should not show interactive update prompt or attempt auto-update
  expect(stdout).not.toContain("Would you like to update now?")
  expect(stdout).not.toContain("Updating tsci using:")

  // Should show non-blocking update note
  expect(stdout).toContain("A new version of tsci is available")
  expect(stdout).toContain("to update.")

  // Should complete init successfully
  expect(stdout).toContain("Initialization complete!")
  expect(exitCode).toBe(0)
}, 30_000)
