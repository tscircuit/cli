import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"
import { signInToFakeCircuithub } from "tests/fixtures/sign-in-to-fake-circuithub"
import { startFakeCircuithubServer } from "tests/fixtures/start-fake-circuithub-server"

test(
  "tsci quote refresh --circuithub renews the access token with the saved refresh token until CircuitHub ends the sign-in",
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
    const configPath = path.join(tmpDir, ".config", "circuithub.json")
    const savedSignIn = async () =>
      JSON.parse(await readFile(configPath, "utf8")).signIn
    // 59 minutes later: the access token is about to expire.
    const timePasses = async () => {
      const config = JSON.parse(await readFile(configPath, "utf8"))
      config.signIn.renewAt = Date.now() - 1000
      config.signIn.expiresAt = Date.now() + 60_000
      await writeFile(configPath, JSON.stringify(config))
    }

    const command = "tsci quote refresh --circuithub 77 --quantity 5"
    // Fresh: used as is.
    expect((await runCommand(command)).exitCode).toBe(0)
    expect(circuithub.refreshCount()).toBe(0)

    await timePasses()
    circuithub.requests.length = 0
    const first = await runCommand(command)
    expect(first.exitCode).toBe(0)
    expect(first.stdout).toContain(
      "CircuitHub quote: project 9001, revision 77",
    )
    expect(circuithub.refreshCount()).toBe(1)
    // The new refresh token replaced the used one before the call was made.
    expect(await savedSignIn()).toMatchObject({
      accessToken: "cha_test_2",
      refreshToken: "chr_test_2",
    })
    expect(
      new Set(circuithub.requests.map((request) => request.authorization)),
    ).toEqual(new Set(["Bearer cha_test_2"]))

    // Next time, it renews with the refresh token saved last time.
    await timePasses()
    const second = await runCommand(command)
    expect(second.exitCode).toBe(0)
    expect(
      circuithub.oauthRequests
        .filter((request) => request.params.grant_type === "refresh_token")
        .map((request) => request.params.refresh_token),
    ).toEqual(["chr_test_1", "chr_test_2"])
    expect(circuithub.activeSignIns()).toBe(1)

    // Disconnected on CircuitHub: the sign-in is removed and the user is
    // asked to sign in again.
    circuithub.disconnectAll()
    await timePasses()
    const ended = await runCommand(command)
    expect(ended.exitCode).toBe(1)
    expect(ended.stderr.trim()).toMatchInlineSnapshot(
      `"CircuitHub has ended this sign-in. Run \`tsci auth add-provider circuithub\` to sign in again."`,
    )
    expect(await savedSignIn()).toBeUndefined()
    expect(first.stdout + second.stdout + ended.stderr).not.toContain(
      "chr_test",
    )
  },
  { timeout: 120_000 },
)
