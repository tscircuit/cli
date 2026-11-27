import { afterEach, beforeEach, expect, spyOn, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { Command } from "commander"
import { registerAuthLogin } from "cli/auth/login/register"
import { registerAuthWhoami } from "cli/auth/whoami/register"
import { cliConfig, getCliConfig } from "lib/cli-config"
import { pushSnippet } from "lib/shared/push-snippet"

const originalToken = process.env.TSCIRCUIT_TOKEN
const originalSkip = process.env.TSCI_SKIP_ACCOUNT_FETCH
const originalSkipSkill = process.env.TSCI_SKIP_SKILL_SETUP
let originalConfig: typeof cliConfig.store
let tempDirs: string[] = []

const createTempProject = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-account-err-"))
  tempDirs.push(dir)
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({
      name: "@tsci/test-user.handle-error-repro",
      version: "0.0.0",
    }),
  )
  fs.writeFileSync(
    path.join(dir, "index.circuit.tsx"),
    "export default () => null\n",
  )
  return dir
}

beforeEach(() => {
  originalConfig = { ...cliConfig.store }
  delete process.env.TSCIRCUIT_TOKEN
  delete process.env.TSCI_SKIP_ACCOUNT_FETCH
  cliConfig.clear()
})

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env.TSCIRCUIT_TOKEN
  } else {
    process.env.TSCIRCUIT_TOKEN = originalToken
  }
  if (originalSkip === undefined) {
    delete process.env.TSCI_SKIP_ACCOUNT_FETCH
  } else {
    process.env.TSCI_SKIP_ACCOUNT_FETCH = originalSkip
  }
  if (originalSkipSkill === undefined) {
    delete process.env.TSCI_SKIP_SKILL_SETUP
  } else {
    process.env.TSCI_SKIP_SKILL_SETUP = originalSkipSkill
  }
  cliConfig.store = originalConfig
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
  tempDirs = []
})

test("pushSnippet reports HTTP 503 verification failure instead of missing handle and ignores cached handle", async () => {
  const projectDir = createTempProject()
  process.env.TSCIRCUIT_TOKEN = "placeholder-token"
  // Ensure a saved handle is NOT used as fallback when TSCIRCUIT_TOKEN lookup fails
  cliConfig.set("tscircuitHandle", "cached-handle")

  let requestCount = 0
  const server = Bun.serve({
    port: 0,
    fetch: (req) => {
      requestCount += 1
      expect(new URL(req.url).pathname).toBe("/accounts/get")
      return Response.json(
        {
          error: {
            error_code: "service_unavailable",
            message: "Simulated outage",
          },
        },
        { status: 503 },
      )
    },
  })
  cliConfig.set("registryApiUrl", server.url.toString())

  const errors: string[] = []
  let exitCode: number | undefined
  const prevCwd = process.cwd()

  try {
    process.chdir(projectDir)
    await pushSnippet({
      filePath: "index.circuit.tsx",
      onError: (msg) => errors.push(msg),
      onExit: (code) => {
        exitCode = code
      },
      onSuccess: () => {
        throw new Error("push should not succeed")
      },
    })

    expect(requestCount).toBe(1)
    expect(exitCode).toBe(1)
    expect(errors.length).toBe(1)
    expect(errors[0]).toContain("Could not verify your account for publishing")
    expect(errors[0]).toContain("HTTP 503")
    expect(errors[0]).toContain("Retry when the registry is available.")
    expect(errors[0]).not.toContain(
      "You need to set your tscircuit handle to publish packages",
    )
  } finally {
    process.chdir(prevCwd)
    server.stop()
  }
})

test("pushSnippet preserves session_expired guidance on HTTP 401", async () => {
  const projectDir = createTempProject()
  process.env.TSCIRCUIT_TOKEN = "expired-token"

  const server = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json(
        {
          error: {
            error_code: "session_expired",
            message: "Session expired",
          },
        },
        { status: 401 },
      ),
  })
  cliConfig.set("registryApiUrl", server.url.toString())

  const errors: string[] = []
  let exitCode: number | undefined
  const prevCwd = process.cwd()

  try {
    process.chdir(projectDir)
    await pushSnippet({
      filePath: "index.circuit.tsx",
      onError: (msg) => errors.push(msg),
      onExit: (code) => {
        exitCode = code
      },
    })

    expect(exitCode).toBe(1)
    expect(errors[0]).toContain("HTTP 401")
    expect(errors[0]).toContain("Your tscircuit session has expired")
    expect(errors[0]).not.toContain("You need to set your tscircuit handle")
  } finally {
    process.chdir(prevCwd)
    server.stop()
  }
})

test("pushSnippet still reports missing handle when account lookup succeeds without a handle", async () => {
  const projectDir = createTempProject()
  process.env.TSCIRCUIT_TOKEN = "valid-token-no-handle"

  const server = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json({
        account: {
          account_id: "acct-123",
          tscircuit_handle: null,
        },
      }),
  })
  cliConfig.set("registryApiUrl", server.url.toString())

  const errors: string[] = []
  let exitCode: number | undefined
  const prevCwd = process.cwd()

  try {
    process.chdir(projectDir)
    await pushSnippet({
      filePath: "index.circuit.tsx",
      onError: (msg) => errors.push(msg),
      onExit: (code) => {
        exitCode = code
      },
    })

    expect(exitCode).toBe(1)
    expect(errors).toEqual([
      "You need to set your tscircuit handle to publish packages",
    ])
  } finally {
    process.chdir(prevCwd)
    server.stop()
  }
})

test("auth whoami exits nonzero with error instead of printing @(not set) on lookup failure", async () => {
  process.env.TSCIRCUIT_TOKEN = "placeholder-token"

  const server = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json(
        { error: { error_code: "service_unavailable", message: "Outage" } },
        { status: 503 },
      ),
  })
  cliConfig.set("registryApiUrl", server.url.toString())

  const program = new Command()
  program.command("auth")
  registerAuthWhoami(program)

  const logs: string[] = []
  const errs: string[] = []
  const logSpy = spyOn(console, "log").mockImplementation((...args) => {
    logs.push(args.join(" "))
  })
  const errSpy = spyOn(console, "error").mockImplementation((...args) => {
    errs.push(args.join(" "))
  })
  const exitSpy = spyOn(process, "exit").mockImplementation(((
    code?: number,
  ) => {
    throw new Error(`EXIT:${code}`)
  }) as never)

  try {
    await expect(
      program.parseAsync(["auth", "whoami"], { from: "user" }),
    ).rejects.toThrow("EXIT:1")

    expect(logs.join("\n")).not.toContain("(not set)")
    expect(errs.join("\n")).toContain("Could not retrieve account information")
    expect(errs.join("\n")).toContain("HTTP 503")
  } finally {
    logSpy.mockRestore()
    errSpy.mockRestore()
    exitSpy.mockRestore()
    server.stop()
  }
})

test("auth login exits nonzero on lookup failure instead of printing @undefined", async () => {
  process.env.TSCIRCUIT_TOKEN = "placeholder-token"

  const server = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json(
        { error: { error_code: "service_unavailable", message: "Outage" } },
        { status: 503 },
      ),
  })
  cliConfig.set("registryApiUrl", server.url.toString())

  const program = new Command()
  program.command("auth")
  registerAuthLogin(program)

  const logs: string[] = []
  const errs: string[] = []
  const logSpy = spyOn(console, "log").mockImplementation((...args) => {
    logs.push(args.join(" "))
  })
  const errSpy = spyOn(console, "error").mockImplementation((...args) => {
    errs.push(args.join(" "))
  })
  const exitSpy = spyOn(process, "exit").mockImplementation(((
    code?: number,
  ) => {
    throw new Error(`EXIT:${code}`)
  }) as never)

  try {
    await expect(
      program.parseAsync(["login"], { from: "user" }),
    ).rejects.toThrow("EXIT:1")

    expect(logs.join("\n")).not.toContain("@undefined")
    expect(errs.join("\n")).toContain("Could not verify your current session")
    expect(errs.join("\n")).toContain("HTTP 503")
  } finally {
    logSpy.mockRestore()
    errSpy.mockRestore()
    exitSpy.mockRestore()
    server.stop()
  }
})

test("auth login does not print @undefined when TSCIRCUIT_TOKEN account has no handle", async () => {
  process.env.TSCIRCUIT_TOKEN = "placeholder-token"
  cliConfig.set("tscircuitHandle", "different-cached-handle")

  const server = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json({
        account: {
          account_id: "acct-env-42",
          tscircuit_handle: null,
        },
      }),
  })
  cliConfig.set("registryApiUrl", server.url.toString())

  const program = new Command()
  program.command("auth")
  registerAuthLogin(program)

  const logs: string[] = []
  const logSpy = spyOn(console, "log").mockImplementation((...args) => {
    logs.push(args.join(" "))
  })

  try {
    await program.parseAsync(["login"], { from: "user" })
    const output = logs.join("\n")
    expect(output).toContain("Already logged in as")
    expect(output).toContain("@acct-env-42")
    expect(output).not.toContain("@undefined")
    expect(output).not.toContain("different-cached-handle")
  } finally {
    logSpy.mockRestore()
    server.stop()
  }
})

test("init gracefully ignores optional author lookup failure when registry returns 503", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-init-503-"))
  tempDirs.push(dir)
  const configDir = path.join(dir, ".config")
  const projectDir = path.join(dir, "my-board")

  const server = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json(
        { error: { error_code: "service_unavailable", message: "Outage" } },
        { status: 503 },
      ),
  })
  const isolatedConfig = getCliConfig({ configDir })
  isolatedConfig.set("registryApiUrl", server.url.toString())

  try {
    const cliEntry = path.resolve(process.cwd(), "cli/main.ts")
    const proc = Bun.spawn({
      cmd: [
        process.execPath,
        "run",
        cliEntry,
        "init",
        projectDir,
        "--yes",
        "--no-install",
      ],
      cwd: dir,
      env: {
        ...process.env,
        TSCIRCUIT_TOKEN: "placeholder-token",
        TSCIRCUIT_CONFIG_DIR: configDir,
        TSCI_SKIP_SKILL_SETUP: "true",
        TSCI_TEST_MODE: "true",
        FORCE_COLOR: "0",
      },
      stdout: "pipe",
      stderr: "pipe",
    })
    const exitCode = await proc.exited
    expect(exitCode).toBe(0)

    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectDir, "package.json"), "utf8"),
    )
    expect(pkg.name).toBe("my-board")
    expect(pkg.author).toBeUndefined()
  } finally {
    server.stop()
  }
}, 20_000)

test("CLI push subprocess reproduces issue #5275 and reports HTTP 503 instead of missing handle", async () => {
  const projectDir = createTempProject()
  const configDir = path.join(projectDir, ".config")

  const server = Bun.serve({
    port: 0,
    fetch: (req) => {
      if (new URL(req.url).pathname === "/accounts/get") {
        return Response.json(
          {
            error: {
              error_code: "service_unavailable",
              message: "Simulated outage",
            },
          },
          { status: 503 },
        )
      }
      return new Response("unexpected route", { status: 500 })
    },
  })
  const isolatedConfig = getCliConfig({ configDir })
  isolatedConfig.set("registryApiUrl", server.url.toString())
  isolatedConfig.set("tscircuitHandle", "cached-handle")

  try {
    const cliEntry = path.resolve(process.cwd(), "cli/main.ts")
    const proc = Bun.spawn({
      cmd: [process.execPath, "run", cliEntry, "push", "index.circuit.tsx"],
      cwd: projectDir,
      env: {
        ...process.env,
        TSCIRCUIT_TOKEN: "placeholder-token",
        TSCIRCUIT_CONFIG_DIR: configDir,
        TSCI_TEST_MODE: "true",
        FORCE_COLOR: "0",
      },
      stdout: "pipe",
      stderr: "pipe",
    })
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])

    expect(exitCode).toBe(1)
    expect(stderr).toContain("Could not verify your account for publishing")
    expect(stderr).toContain("HTTP 503")
    expect(stderr).toContain("Retry when the registry is available.")
    expect(stderr + stdout).not.toContain(
      "You need to set your tscircuit handle to publish packages",
    )
  } finally {
    server.stop()
  }
}, 20_000)
