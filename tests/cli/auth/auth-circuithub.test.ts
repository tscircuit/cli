import { expect, test } from "bun:test"
import path from "node:path"
import * as jwt from "jsonwebtoken"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

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
  "tsci auth circuithub login receives the token at its localhost callback",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture({
      env: { CIRCUITHUB_TOKEN: undefined, CIRCUITHUB_API_KEY: undefined },
    })
    const token = jwt.sign(
      { sub: "44738", name: "Ada Lovelace" },
      "circuithub-test-secret",
      { expiresIn: "24h" },
    )

    const login = Bun.spawn({
      cmd: [
        "bun",
        "run",
        path.resolve(process.cwd(), "cli/main.ts"),
        "auth",
        "circuithub",
        "login",
      ],
      cwd: tmpDir,
      env: {
        ...process.env,
        CIRCUITHUB_TOKEN: "",
        CIRCUITHUB_LOGIN_URL: "https://app.circuithub.example/auth/cli",
        TSCIRCUIT_CONFIG_DIR: path.join(tmpDir, ".config"),
        FORCE_COLOR: "0",
      },
      stdout: "pipe",
      stderr: "pipe",
    })
    globalThis.deferredCleanupFns.push(async () => {
      login.kill()
    })
    const reader = login.stdout.getReader()
    const prompt = await readUntil(reader, /redirect_uri=\S+/)
    const loginUrl = prompt.match(/https:\/\/\S+/)![0]
    expect(loginUrl).toMatch(
      /^https:\/\/app\.circuithub\.example\/auth\/cli\?redirect_uri=http:\/\/localhost:\d+\/cb$/,
    )

    // Play the browser: CircuitHub redirects to the callback with the token.
    const callback = new URL(loginUrl).searchParams.get("redirect_uri")!
    const port = new URL(callback).port
    const rejected = await fetch(`http://127.0.0.1:${port}/cb?token=not-a-jwt`)
    expect(rejected.status).toBe(400)
    const accepted = await fetch(`http://127.0.0.1:${port}/cb?token=${token}`)
    expect(accepted.status).toBe(200)
    expect(await accepted.text()).toContain("Logged in to CircuitHub")

    const output = prompt + (await readUntil(reader, /Session expires/))
    expect(await login.exited).toBe(0)
    expect(output).toContain("Logged in to CircuitHub as Ada Lovelace")
    expect(output).not.toContain(token)

    const status = await runCommand("tsci auth circuithub status")
    expect(status.exitCode).toBe(0)
    expect(status.stdout).toContain("Logged in to CircuitHub as Ada Lovelace")
    expect(status.stdout).not.toContain(token)

    const logout = await runCommand("tsci auth circuithub logout")
    expect(logout.stdout.trim()).toBe("Logged out of CircuitHub")
    const afterLogout = await runCommand("tsci auth circuithub status")
    expect(afterLogout.exitCode).toBe(1)
    expect(afterLogout.stdout).toContain("Not logged in to CircuitHub")
  },
  { timeout: 60_000 },
)
