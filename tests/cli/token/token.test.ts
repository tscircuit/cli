import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"

const demoJwtToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

test("print and set token explicitly", async () => {
  const { runCommand } = await getCliTestFixture()

  // Test printing token without authentication
  const { stdout: invalidTokenPrintStdout, stderr: invalidTokenPrintStderr } =
    await runCommand("tsci auth print-token")
  expect(invalidTokenPrintStdout).toContain(
    "You need to log in to access this.",
  )
  expect(invalidTokenPrintStderr).toBeFalsy()

  // Test setting an invalid token
  const { stdout: invalidTokenSetStdout, stderr: invalidTokenSetStderr } =
    await runCommand("tsci auth set-token invalid-token-example")
  expect(invalidTokenSetStdout).toContain("Invalid token provided")
  expect(invalidTokenSetStderr).toBeFalsy()

  // Test setting a valid token
  const { stdout: validTokenSetStdout, stderr: validTokenSetStderr } =
    await runCommand(`tsci auth set-token ${demoJwtToken}`)
  expect(validTokenSetStdout).toContain("Token manually updated.")
  expect(validTokenSetStderr).toBeFalsy()

  // Test printing the valid token
  const { stdout: validTokenPrintStdout, stderr: validTokenPrintStderr } =
    await runCommand("tsci auth print-token")
  expect(validTokenPrintStdout).toContain(demoJwtToken)
  expect(validTokenPrintStderr).toBeFalsy()

  // Additional test: Verify token is correctly stored and can be reused
  const { stdout: reprintTokenStdout } = await runCommand(
    "tsci auth print-token",
  )
  expect(reprintTokenStdout).toContain(demoJwtToken) // Ensure token persists
})
