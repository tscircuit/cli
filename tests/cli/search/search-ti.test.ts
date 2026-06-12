import { expect, test } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

// Marked `test.failing` on purpose.
//
// `tsci search --ti` queries the Texas Instruments parts backend via
// `@tscircuit/ti-parts-engine`. That package's default endpoint is served by an
// ephemeral Cloudflare quick-tunnel that is currently offline (returns HTTP 530
// "Origin DNS error"). Like the other search sources, the CLI does not swallow
// upstream errors, so a down backend makes the command exit non-zero with the
// error on stderr and the assertions below fail.
//
// The assertions describe the intended behavior once the backend is back up.
// `test.failing` keeps the suite green while it's down and will start failing
// (alerting us) the moment the endpoint returns and these assertions pass — at
// which point this marker should be removed.
test.failing("search --ti returns Texas Instruments results", async () => {
  const { runCommand } = await getCliTestFixture()
  const { stdout, stderr } = await runCommand("tsci search --ti LM358")
  expect(stderr).toBe("")
  expect(stdout).toContain("Texas Instruments")
  expect(stdout).not.toContain("JLC search")
})
