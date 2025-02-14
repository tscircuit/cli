import { expect, test } from "bun:test"
import { setSessionToken } from "lib/cli-config"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

// A dummy valid JWT token (header.payload.signature)
const dummyJwtToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ." +
  "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

test("login command: already logged in", async () => {
  const { runCommand } = await getCliTestFixture()

  // Simulate an already logged in state by setting a session token.
  setSessionToken(dummyJwtToken)

  const { stdout, stderr } = await runCommand("tsci login")

  expect(stderr).toBe("")
  expect(stdout).toContain(
    "Already logged in! Use 'tsci logout' if you need to switch accounts.",
  )
})
