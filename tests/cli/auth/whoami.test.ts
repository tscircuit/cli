import { expect, test } from "bun:test"
import { cliConfig } from "lib/cli-config"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("auth whoami prompts login when not authenticated", async () => {
  const { runCommand } = await getCliTestFixture()

  cliConfig.clear()

  const { stdout, stderr } = await runCommand("tsci auth whoami")

  expect(stderr).toBe("")
  expect(stdout).toContain("You need to log in to access this.")
})

test("auth whoami prints account details when logged in", async () => {
  const { runCommand } = await getCliTestFixture({ loggedIn: true })

  const { stdout, stderr } = await runCommand("tsci auth whoami")

  expect(stderr).toBe("")
  expect(stdout).toContain("Logged in user:")
  expect(stdout).toContain("TscHandle:")
  expect(stdout).toContain("Account ID:")
  expect(stdout).toContain("Session ID:")
})
