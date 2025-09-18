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
  expect(stdout).toContain("Currently logged in user:")
  expect(stdout).toContain("GitHub Username: test-user")
  expect(stdout).toContain("Account ID: account-1234")
  expect(stdout).toContain("Session ID: session-123")
  expect(stdout).not.toContain("Shipping Info")
})
