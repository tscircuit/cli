import { expect, test } from "bun:test"
import { cliConfig } from "lib/cli-config"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

// A dummy valid JWT token (header.payload.signature)
const dummyJwtToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ." +
  "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

test("login command: already logged in", async () => {
  const { runCommand } = await getCliTestFixture({
    loggedIn: true,
  })

  // Simulate an already logged in state by setting a session token.
  cliConfig.set("sessionToken", dummyJwtToken)

  const { stdout, stderr } = await runCommand("tsci login")

  // TODO: Remove this when the autorouter is not emitting this warning
  expect(stderr).toBe("")
  expect(stdout).toMatch(
    /Already logged in as .*! Use 'tsci logout' if you need to switch accounts\./,
  )

  cliConfig.delete("sessionToken")
})
