import { expect, test } from "bun:test"
import { getCliConfig } from "lib/cli-config"
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const missingHandleMessage =
  "You need to set your tscircuit handle to publish packages"

const runPushWithAccountResponse = async (response: () => Response) => {
  const { tmpDir, runCommand, registryDb } = await getCliTestFixture({
    loggedIn: true,
  })
  const config = getCliConfig({ configDir: path.join(tmpDir, ".config") })
  config.delete("sessionToken")
  config.delete("tscircuitHandle")
  config.delete("accountId")

  const requests: string[] = []
  const server = Bun.serve({
    port: 0,
    fetch: (request) => {
      const pathname = new URL(request.url).pathname
      requests.push(`${request.method} ${pathname}`)
      if (pathname === "/accounts/get") return response()
      return new Response("Unexpected request", { status: 500 })
    },
  })
  config.set("registryApiUrl", server.url.toString())

  const packageJsonPath = path.join(tmpDir, "package.json")
  const packageJson = JSON.stringify({
    name: "@tsci/test-user.test-package",
    version: "1.0.0",
  })
  writeFileSync(packageJsonPath, packageJson)
  writeFileSync(
    path.join(tmpDir, "index.circuit.tsx"),
    "export default () => null",
  )

  const originalToken = process.env.TSCIRCUIT_TOKEN
  process.env.TSCIRCUIT_TOKEN = registryDb.accounts[0].account_id

  try {
    const result = await runCommand("tsci push index.circuit.tsx")
    expect(result.exitCode).toBe(1)
    expect(requests).toEqual(["POST /accounts/get"])
    expect(readFileSync(packageJsonPath, "utf8")).toBe(packageJson)
    return result
  } finally {
    server.stop()
    if (originalToken === undefined) {
      delete process.env.TSCIRCUIT_TOKEN
    } else {
      process.env.TSCIRCUIT_TOKEN = originalToken
    }
  }
}

const accountServiceUnavailable = () =>
  Response.json(
    {
      error: {
        error_code: "service_unavailable",
        message: "Account service is temporarily unavailable",
      },
    },
    { status: 503 },
  )

test("repro: push misreports an account-service outage as a missing handle", async () => {
  const { stdout, stderr } = await runPushWithAccountResponse(
    accountServiceUnavailable,
  )

  expect(stdout).toBe("")
  expect(stderr.trim()).toMatchInlineSnapshot(
    `"You need to set your tscircuit handle to publish packages"`,
  )
}, 30_000)

// Issue #5275: an unsuccessful lookup does not establish a missing handle.
test.failing(
  "push preserves the account lookup failure instead of requesting a handle",
  async () => {
    const { stderr } = await runPushWithAccountResponse(
      accountServiceUnavailable,
    )

    expect(stderr).not.toContain(missingHandleMessage)
    expect(stderr).toContain("503")
  },
  30_000,
)

test("push requests a handle when a successful account response genuinely lacks one", async () => {
  const { stderr } = await runPushWithAccountResponse(() =>
    Response.json({
      account: { account_id: "test-account", tscircuit_handle: null },
    }),
  )

  expect(stderr.trim()).toBe(missingHandleMessage)
}, 30_000)
