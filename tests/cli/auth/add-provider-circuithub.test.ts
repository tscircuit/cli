import { expect, test } from "bun:test"
import { readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"
import { signInToFakeCircuithub } from "tests/fixtures/sign-in-to-fake-circuithub"
import { startFakeCircuithubServer } from "tests/fixtures/start-fake-circuithub-server"

const BOARD_SOURCE = `export default () => (
  <board width="20mm" height="20mm">
    <resistor name="R1" resistance="1k" footprint="0402" />
  </board>
)
`

test(
  "tsci auth add-provider circuithub signs in to CircuitHub with OAuth through the browser",
  async () => {
    const circuithub = await startFakeCircuithubServer()
    const env = {
      CIRCUITHUB_TOKEN: undefined,
      CIRCUITHUB_API_KEY: undefined,
      CIRCUITHUB_API_URL: circuithub.apiUrl,
      CIRCUITHUB_LOGIN_URL: circuithub.loginUrl,
    }
    const { tmpDir, runCommand } = await getCliTestFixture({ env })
    await writeFile(path.join(tmpDir, "board.circuit.tsx"), BOARD_SOURCE)

    const signedIn = await signInToFakeCircuithub({ tmpDir, env })
    expect(signedIn.callbackStatus).toBe(200)
    expect(signedIn.exitCode).toBe(0)

    // The sign-in page is asked for tokens for the API (not the MCP
    // server), for "Engineering" at most (no ordering or billing), with PKCE.
    const params = Object.fromEntries(signedIn.authorizeUrl.searchParams)
    expect(params).toMatchObject({
      response_type: "code",
      client_id: "tscircuit-cli-client",
      code_challenge_method: "S256",
      resource: circuithub.loginUrl,
      scope: "read design issues",
    })
    expect(params.redirect_uri).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/callback$/)
    const registration = circuithub.oauthRequests.find(
      (request) => request.path === "/oauth/register",
    )
    expect(registration?.params).toMatchObject({
      client_name: "tscircuit CLI",
      redirect_uris: ["http://127.0.0.1/callback"],
      token_endpoint_auth_method: "none",
    })

    // What the user sees, starting with the command they ran.
    const command = "tsci auth add-provider circuithub"
    expect(
      `$ ${command}\n${signedIn.stdout}`
        .replace(/\?\S+/, "?<query>")
        .replaceAll(circuithub.loginUrl, "<circuithub>")
        .trim(),
    ).toMatchInlineSnapshot(`
      "$ tsci auth add-provider circuithub
      Sign in to CircuitHub to add it as a provider:
        <circuithub>/oauth/authorize?<query>
      If the browser is on another machine, paste the URL it ends up on here.
      Added CircuitHub (access: read, design, issues)."
    `)

    // Tokens are saved where only the user can read them, never printed.
    const configPath = path.join(tmpDir, ".config", "circuithub.json")
    expect((await stat(configPath)).mode & 0o777).toBe(0o600)
    const { signIn } = JSON.parse(await readFile(configPath, "utf8"))
    expect(signIn).toMatchObject({
      clientId: "tscircuit-cli-client",
      resource: circuithub.loginUrl,
      accessToken: "cha_test_1",
      refreshToken: "chr_test_1",
      scope: "read design issues",
    })
    expect(signedIn.stdout + signedIn.stderr).not.toContain("cha_test")
    expect(signedIn.stdout + signedIn.stderr).not.toContain("chr_test")

    // Adding it again keeps the saved sign-in.
    const again = await runCommand(command)
    expect(again.exitCode).toBe(0)
    expect(again.stdout.trim()).toMatchInlineSnapshot(
      `"CircuitHub is already added (access: read, design, issues)."`,
    )

    // Quotes use the saved sign-in's access token without asking again.
    const quote = await runCommand(
      "tsci quote create --circuithub board.circuit.tsx --workspace acme --export-classification EAR99",
    )
    expect(quote.exitCode).toBe(0)
    expect(quote.stdout).toContain(
      "CircuitHub quote: project 9001, revision 77",
    )
    expect(
      new Set(circuithub.requests.map((request) => request.authorization)),
    ).toEqual(new Set(["Bearer cha_test_1"]))
    expect(circuithub.refreshCount()).toBe(0)
  },
  { timeout: 120_000 },
)
