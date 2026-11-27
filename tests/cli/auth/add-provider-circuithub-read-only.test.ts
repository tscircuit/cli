import { expect, test } from "bun:test"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"
import { signInToFakeCircuithub } from "tests/fixtures/sign-in-to-fake-circuithub"
import { startFakeCircuithubServer } from "tests/fixtures/start-fake-circuithub-server"

test(
  "tsci auth add-provider circuithub warns when CircuitHub only allows reading, which can't quote",
  async () => {
    // The user picked "Read only" on CircuitHub's sign-in page.
    const circuithub = await startFakeCircuithubServer({ grantedScope: "read" })
    const env = {
      CIRCUITHUB_TOKEN: undefined,
      CIRCUITHUB_API_KEY: undefined,
      CIRCUITHUB_API_URL: circuithub.apiUrl,
      CIRCUITHUB_LOGIN_URL: circuithub.loginUrl,
    }
    const { tmpDir, runCommand } = await getCliTestFixture({ env })
    const signedIn = await signInToFakeCircuithub({ tmpDir, env })
    expect(signedIn.exitCode).toBe(0)
    expect(
      signedIn.stdout.trim().split("\n").slice(-2).join("\n"),
    ).toMatchInlineSnapshot(`
      "Added CircuitHub (access: read).
      CircuitHub only allowed reading, so quotes will be refused. Allow "Engineering" access for tscircuit CLI on CircuitHub under Settings → Connected apps, or run \`tsci auth remove-provider circuithub\` and add it again choosing Engineering."
    `)

    // Quoting is refused with CircuitHub's explanation.
    const quote = await runCommand(
      "tsci quote refresh --circuithub 77 --quantity 10",
    )
    expect(quote.exitCode).toBe(1)
    expect(quote.stderr).toContain(
      "CircuitHub POST /quotes failed with HTTP 403: This connection may not change designs or request quotes.",
    )
  },
  { timeout: 120_000 },
)
