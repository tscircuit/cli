import { expect, test } from "bun:test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"
import { signInToFakeCircuithub } from "tests/fixtures/sign-in-to-fake-circuithub"
import { startFakeCircuithubServer } from "tests/fixtures/start-fake-circuithub-server"

test(
  "tsci auth remove-provider circuithub ends the CircuitHub sign-in and forgets it",
  async () => {
    const circuithub = await startFakeCircuithubServer()
    const env = {
      CIRCUITHUB_TOKEN: undefined,
      CIRCUITHUB_API_KEY: undefined,
      CIRCUITHUB_API_URL: circuithub.apiUrl,
      CIRCUITHUB_LOGIN_URL: circuithub.loginUrl,
    }
    const { tmpDir, runCommand } = await getCliTestFixture({ env })
    expect((await signInToFakeCircuithub({ tmpDir, env })).exitCode).toBe(0)
    expect(circuithub.activeSignIns()).toBe(1)

    const command = "tsci auth remove-provider circuithub"
    const removed = await runCommand(command)
    expect(removed.exitCode).toBe(0)
    expect(`$ ${command}\n${removed.stdout}`.trim()).toMatchInlineSnapshot(`
      "$ tsci auth remove-provider circuithub
      Removed CircuitHub and ended its sign-in."
    `)

    // The refresh token was revoked at CircuitHub, which ends the sign-in.
    const revoke = circuithub.oauthRequests.find(
      (request) => request.path === "/oauth/revoke",
    )
    expect(revoke?.params).toEqual({
      token: "chr_test_1",
      client_id: "tscircuit-cli-client",
    })
    expect(circuithub.activeSignIns()).toBe(0)
    const configPath = path.join(tmpDir, ".config", "circuithub.json")
    expect(JSON.parse(await readFile(configPath, "utf8"))).toEqual({})

    // Quotes now ask to add CircuitHub again.
    const quote = await runCommand(
      "tsci quote create --circuithub board.circuit.tsx --workspace acme --export-classification EAR99",
    )
    expect(quote.exitCode).toBe(1)
    expect(quote.stderr).toContain("Run `tsci auth add-provider circuithub`")

    // Removing it again is harmless.
    const again = await runCommand(command)
    expect(again.exitCode).toBe(0)
    expect(again.stdout.trim()).toMatchInlineSnapshot(
      `"CircuitHub isn't added; nothing to remove."`,
    )
  },
  { timeout: 120_000 },
)
