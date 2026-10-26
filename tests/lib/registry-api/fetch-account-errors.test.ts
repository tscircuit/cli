import { expect, test } from "bun:test"
import path from "node:path"

// The exact production modules run in isolated processes. HTTP/config and
// unrelated command side effects are synthetic boundaries, not CLI integration.
const runScenario = (consumer: string, scenario: string) => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      path.resolve(
        import.meta.dir,
        "../../fixtures/account-lookup-scenario.ts",
      ),
      consumer,
      scenario,
    ],
    cwd: path.resolve(import.meta.dir, "../../.."),
    env: {},
    stdout: "pipe",
    stderr: "pipe",
  })
  expect(result.exitCode).toBe(0)
  expect(result.stderr.toString()).toBe("")
  return JSON.parse(result.stdout.toString())
}

for (const scenario of [
  "http-503",
  "http-401",
  "http-403",
  "http-429",
  "network",
  "invalid-status",
  "invalid-json",
  "missing-account",
  "null-account",
  "array-account",
  "throw-response-getter",
  "throw-status-getter",
  "throw-prototype-proxy",
  "revoked-proxy",
]) {
  test(`fetchAccount rejects ${scenario} instead of returning no account`, () => {
    const result = runScenario("helper", scenario)
    expect(result.caught).toContain("account")
    expect(result.caught).not.toContain("synthetic-secret-must-not-appear")
    if (scenario.startsWith("http-"))
      expect(result.caught).toContain(scenario.slice(5))
    expect(result.value).toBeUndefined()
    expect(result.requests).toEqual(["accounts/get"])
  })
}

test("fetchAccount returns null without authentication and does not contact the registry", () => {
  const result = runScenario("helper", "no-token")
  expect(result.value).toBeNull()
  expect(result.requests).toEqual([])
})

test("fetchAccount returns a successfully retrieved account without a handle", () => {
  const result = runScenario("helper", "no-handle")
  expect(result.value.account_id).toBe("account_fixture")
  expect(result.value.tscircuit_handle).toBeNull()
  expect(result.caught).toBeUndefined()
})

for (const consumer of ["push", "whoami", "login"]) {
  for (const scenario of [
    "http-503",
    "http-401",
    "network",
    "invalid-json",
    "missing-account",
    "throw-response-getter",
    "throw-status-getter",
    "throw-prototype-proxy",
    "revoked-proxy",
  ]) {
    test(`${consumer} reports ${scenario} without success or missing-handle claims`, () => {
      const result = runScenario(consumer, scenario)
      expect(result.caught).toBeUndefined()
      expect(result.exitCode).toBe(1)
      expect(result.errors.join("\n")).toContain("account")
      expect(JSON.stringify(result)).not.toContain(
        "synthetic-secret-must-not-appear",
      )
      expect(result.output).toEqual([])
      expect(result.errors.join("\n")).not.toContain(
        "set your tscircuit handle",
      )
      expect(result.requests).toEqual(["accounts/get"])
      expect(result.manifestUnchanged).toBe(true)
    })
  }
}

test("push does not use the saved handle after an environment-token lookup failure", () => {
  const result = runScenario("push", "cached-503")
  expect(result.exitCode).toBe(1)
  expect(result.errors.join("\n")).toContain("503")
  expect(result.requests).toEqual(["accounts/get"])
})

test("push retains the missing-handle message for a successful account lookup", () => {
  const result = runScenario("push", "no-handle")
  expect(result.exitCode).toBe(1)
  expect(result.errors).toEqual([
    "You need to set your tscircuit handle to publish packages",
  ])
})

test("push keeps saved-session authentication without an account lookup", () => {
  const result = runScenario("push", "saved-session")
  expect(result.stopped).toBe(true)
  expect(result.requests).toEqual(["package_releases/list"])
  expect(result.errors).toEqual([])
})

test("push without a token requests login without account lookup", () => {
  const result = runScenario("push", "no-token")
  expect(result.exitCode).toBe(1)
  expect(result.requests).toEqual([])
  expect(result.errors.join("\n")).toContain("tsci login")
})

test("whoami without a token retains its login prompt", () => {
  const result = runScenario("whoami", "no-token")
  expect(result.exitCode).toBe(0)
  expect(result.requests).toEqual([])
  expect(result.output.join("\n")).toContain("need to log in")
})

test("push with a valid handle passes validation without modifying the manifest", () => {
  const result = runScenario("push", "ok")
  expect(result.stopped).toBe(true)
  expect(result.requests).toEqual(["accounts/get", "package_releases/list"])
  expect(result.errors).toEqual([])
  expect(result.manifestUnchanged).toBe(true)
})

for (const consumer of ["whoami", "login"]) {
  test(`${consumer} retains successful account output`, () => {
    const result = runScenario(consumer, "ok")
    expect(result.exitCode).toBe(0)
    expect(result.output.join("\n")).toContain("fixture-user")
    expect(result.errors).toEqual([])
  })
}

test("init treats account lookup failure as optional author enrichment", () => {
  const result = runScenario("init", "http-503")
  expect(result.caught).toBeUndefined()
  expect(result.exitCode).toBe(0)
  expect(result.effects).toEqual(["init:package", "init:setup"])
  expect(result.authorName).toBeUndefined()
})

test("init uses a successfully retrieved handle for its author", () => {
  const result = runScenario("init", "ok")
  expect(result.authorName).toBe("fixture-user")
  expect(result.exitCode).toBe(0)
})

for (const scenario of [
  "throw-response-getter",
  "throw-status-getter",
  "throw-prototype-proxy",
  "revoked-proxy",
]) {
  test(`init remains best-effort after ${scenario}`, () => {
    const result = runScenario("init", scenario)
    expect(result.caught).toBeUndefined()
    expect(result.exitCode).toBe(0)
    expect(result.effects).toEqual(["init:package", "init:setup"])
    expect(JSON.stringify(result)).not.toContain(
      "synthetic-secret-must-not-appear",
    )
  })
}
