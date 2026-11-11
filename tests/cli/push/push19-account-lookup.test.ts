import { expect, test } from "bun:test"
import { getCliConfig } from "lib/cli-config"
import { writeFileSync } from "node:fs"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

test("push reports missing handle when TSCIRCUIT_TOKEN account lookup succeeds without a handle", async () => {
  const { tmpDir, runCommand, registryDb } = await getCliTestFixture({
    loggedIn: true,
  })
  const config = getCliConfig({ configDir: path.join(tmpDir, ".config") })
  config.delete("sessionToken")
  config.delete("tscircuitHandle")
  config.delete("accountId")
  registryDb.accounts[0].tscircuit_handle = ""
  const originalToken = process.env.TSCIRCUIT_TOKEN
  process.env.TSCIRCUIT_TOKEN = registryDb.accounts[0].account_id

  writeFileSync(
    path.join(tmpDir, "index.circuit.tsx"),
    "export default () => null\n",
  )
  writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "@tsci/test-user.handle-missing",
      version: "0.0.1",
    }),
  )

  try {
    const { stdout, stderr, exitCode } = await runCommand("tsci push")
    const combined = `${stdout}\n${stderr}`

    expect(exitCode).toBe(1)
    expect(combined).toContain(
      "You need to set your tscircuit handle to publish packages",
    )
  } finally {
    if (originalToken === undefined) {
      delete process.env.TSCIRCUIT_TOKEN
    } else {
      process.env.TSCIRCUIT_TOKEN = originalToken
    }
  }
}, 30_000)

test("push reports account lookup failure instead of missing handle on HTTP 503, 401 session_expired, network error, or malformed response", async () => {
  const scenarios = [
    {
      name: "http-503",
      preloadCode: `
globalThis.fetch = (async (input: Request | URL | string) => {
  const url = typeof input === "string" || input instanceof URL ? String(input) : input.url
  if (new URL(url).pathname.endsWith("/accounts/get")) {
    return Response.json(
      { error: { error_code: "service_unavailable", message: "Simulated outage" } },
      { status: 503 },
    )
  }
  throw new Error("Unexpected request blocked")
}) as typeof fetch
`,
      expectedSubstring: "503",
    },
    {
      name: "http-401-expired",
      preloadCode: `
globalThis.fetch = (async (input: Request | URL | string) => {
  const url = typeof input === "string" || input instanceof URL ? String(input) : input.url
  if (new URL(url).pathname.endsWith("/accounts/get")) {
    return Response.json(
      { error: { error_code: "session_expired", message: "Session has expired" } },
      { status: 401 },
    )
  }
  throw new Error("Unexpected request blocked")
}) as typeof fetch
`,
      expectedSubstring: "Your tscircuit session has expired",
    },
    {
      name: "network-error",
      preloadCode: `
globalThis.fetch = (async () => {
  throw new TypeError("fetch failed: network unreachable")
}) as typeof fetch
`,
      expectedSubstring: "network unreachable",
    },
    {
      name: "malformed-response",
      preloadCode: `
globalThis.fetch = (async (input: Request | URL | string) => {
  const url = typeof input === "string" || input instanceof URL ? String(input) : input.url
  if (new URL(url).pathname.endsWith("/accounts/get")) {
    return Response.json({}, { status: 200 })
  }
  throw new Error("Unexpected request blocked")
}) as typeof fetch
`,
      expectedSubstring: "Invalid account response from registry",
    },
  ]

  for (const scenario of scenarios) {
    const { tmpDir } = await getCliTestFixture({ loggedIn: true })
    const preloadPath = path.join(tmpDir, `${scenario.name}.preload.ts`)
    writeFileSync(preloadPath, scenario.preloadCode)

    const fixtureWithPreload = await getCliTestFixture({
      loggedIn: true,
      preload: preloadPath,
      env: { TSCIRCUIT_TOKEN: "placeholder-token" },
    })
    writeFileSync(
      path.join(fixtureWithPreload.tmpDir, "index.circuit.tsx"),
      "export default () => null\n",
    )
    writeFileSync(
      path.join(fixtureWithPreload.tmpDir, "package.json"),
      JSON.stringify({
        name: "@tsci/test-user.handle-error-repro",
        version: "0.0.0",
      }),
    )

    const { stdout, stderr, exitCode } =
      await fixtureWithPreload.runCommand("tsci push")
    const combined = `${stdout}\n${stderr}`

    expect(exitCode).toBe(1)
    expect(combined).toContain("Could not verify your account for publishing:")
    expect(combined).toContain(scenario.expectedSubstring)
    expect(combined).not.toContain(
      "You need to set your tscircuit handle to publish packages",
    )
  }
}, 60_000)
