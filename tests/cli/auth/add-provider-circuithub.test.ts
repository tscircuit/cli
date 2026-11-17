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
  "tsci auth add-provider circuithub logs in to CircuitHub through the browser",
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
    const command = "tsci auth add-provider circuithub"

    const addProvider = Bun.spawn({
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
      addProvider.kill()
    })
    const stdoutReader = addProvider.stdout.getReader()
    const prompt = await readUntil(stdoutReader, /ends up on here\.\n/)
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

    const stdout = prompt + (await readUntil(stdoutReader, /a^/))
    expect(await addProvider.exited).toBe(0)
    expect(stdout).not.toContain(token)
    // What the user sees, starting with the command they ran.
    expect(
      `$ ${command}\n${stdout.replaceAll(port, "<port>")}`.trim(),
    ).toMatchInlineSnapshot(`
      "$ tsci auth add-provider circuithub
      Log in to CircuitHub to add it as a provider:
        https://app.circuithub.example/auth/cli?redirect_uri=http://localhost:<port>/cb
      If the browser is on another machine, paste the URL it ends up on here.
      Added CircuitHub (logged in as Ada Lovelace)"
    `)

    // Adding it again keeps the saved session.
    const again = await runCommand(command)
    expect(again.exitCode).toBe(0)
    expect(again.stdout.trim()).toMatchInlineSnapshot(
      `"CircuitHub is already added (logged in as Ada Lovelace)."`,
    )

    // Quotes use the saved session without asking to log in.
    const quote = await runCommand(
      "tsci quote create --circuithub board.circuit.tsx --workspace acme --export-classification EAR99",
    )
    expect(quote.exitCode).toBe(0)
    expect(quote.stdout).toContain(
      "CircuitHub quote: project 9001, revision 77",
    )
  },
  { timeout: 120_000 },
)
