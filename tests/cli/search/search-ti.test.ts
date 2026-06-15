import { expect, test } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

// This asserts the CURRENT failure, not the intended behavior.
//
// `tsci search --ti` queries the Texas Instruments parts backend via
// `@tscircuit/ti-parts-engine`, whose default endpoint is served by an
// ephemeral Cloudflare quick-tunnel that is currently offline (HTTP 530
// "Origin DNS error"). Like the other search sources, the CLI does not swallow
// upstream errors, so the command exits non-zero with the error on stderr.
//
// When the backend comes back, this test will start failing (exit 0, results on
// stdout) — that is the signal to rewrite it to assert the real results, e.g.
//   expect(stderr).toBe("")
//   expect(stdout).toContain("Texas Instruments")
test("search --ti errors while the TI parts backend is unavailable", async () => {
  const { runCommand } = await getCliTestFixture()
  const { stdout, stderr, exitCode } = await runCommand(
    "tsci search --ti LM358",
  )
  expect(exitCode).toBe(1)
  expect(stderr).toContain("Failed to search registry")
  expect(stdout).toBe("")
})
