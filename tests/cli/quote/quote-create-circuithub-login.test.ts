import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import * as jwt from "jsonwebtoken"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"
import { startFakeCircuithubServer } from "tests/fixtures/start-fake-circuithub-server"

const BOARD_SOURCE = `export default () => (
  <board width="20mm" height="20mm">
    <resistor name="R1" resistance="1k" footprint="0402" />
  </board>
)
`

const readUntil = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  pattern: RegExp,
) => {
  let output = ""
  while (!pattern.test(output)) {
    const { value, done } = await reader.read()
    if (done) break
    output += new TextDecoder().decode(value)
  }
  return output
}

test(
  "tsci quote create --circuithub logs in to CircuitHub through the browser, then quotes",
  async () => {
    const token = jwt.sign(
      { sub: "44738", name: "Ada Lovelace" },
      "circuithub-test-secret",
      { expiresIn: "24h" },
    )
    const circuithub = await startFakeCircuithubServer({ token })
    const env = {
      CIRCUITHUB_TOKEN: undefined,
      CIRCUITHUB_API_KEY: undefined,
      CIRCUITHUB_API_URL: circuithub.apiUrl,
      CIRCUITHUB_LOGIN_URL: "https://app.circuithub.example/auth/cli",
    }
    const { tmpDir, runCommand } = await getCliTestFixture({ env })
    await writeFile(path.join(tmpDir, "board.circuit.tsx"), BOARD_SOURCE)
    const command =
      "tsci quote create --circuithub board.circuit.tsx --workspace acme --export-classification EAR99"

    const quote = Bun.spawn({
      cmd: [
        "bun",
        "run",
        path.resolve(process.cwd(), "cli/main.ts"),
        ...command.split(" ").slice(1),
      ],
      cwd: tmpDir,
      env: {
        ...process.env,
        ...env,
        CIRCUITHUB_TOKEN: "",
        CIRCUITHUB_API_KEY: "",
        TSCIRCUIT_CONFIG_DIR: path.join(tmpDir, ".config"),
        FORCE_COLOR: "0",
      },
      stdout: "pipe",
      stderr: "pipe",
    })
    globalThis.deferredCleanupFns.push(async () => {
      quote.kill()
    })
    const stderrReader = quote.stderr.getReader()
    const prompt = await readUntil(stderrReader, /ends up on here\.\n/)
    const loginUrl = prompt.match(/https:\/\/\S+/)![0]
    const port = new URL(new URL(loginUrl).searchParams.get("redirect_uri")!)
      .port

    // The browser lands on the local callback with CircuitHub's token.
    // A URL without a valid token is turned away and the CLI keeps waiting.
    expect(
      (await fetch(`http://127.0.0.1:${port}/cb?token=not-a-jwt`)).status,
    ).toBe(400)
    expect(
      (await fetch(`http://127.0.0.1:${port}/cb?token=${token}`)).status,
    ).toBe(200)

    const stderr = prompt + (await readUntil(stderrReader, /a^/))
    const stdout = await new Response(quote.stdout).text()
    expect(await quote.exited).toBe(0)
    expect(stderr + stdout).not.toContain(token)
    // What the user sees: the command they ran, the login prompt, then the
    // quote carries on.
    const loginBlock = stderr.slice(
      stderr.indexOf("Log in to CircuitHub"),
      stderr.indexOf("\n", stderr.indexOf("Logged in to CircuitHub")),
    )
    expect(
      `$ ${command}\n${loginBlock.replaceAll(port, "<port>")}`,
    ).toMatchInlineSnapshot(`
      "$ tsci quote create --circuithub board.circuit.tsx --workspace acme --export-classification EAR99
      Log in to CircuitHub to continue:
        https://app.circuithub.example/auth/cli?redirect_uri=http://localhost:<port>/cb
      If the browser is on another machine, paste the URL it ends up on here.
      Logged in to CircuitHub as Ada Lovelace"
    `)
    expect(stdout).toContain("CircuitHub project 9001, revision 77")

    // The session is saved, so the next quote doesn't ask again.
    const second = await runCommand(command)
    expect(second.exitCode).toBe(0)
    expect(second.stderr).not.toContain("Log in to CircuitHub")
    expect(second.stdout).toContain("CircuitHub project 9001, revision 77")
  },
  { timeout: 120_000 },
)
