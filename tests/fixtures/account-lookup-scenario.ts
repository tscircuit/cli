// Run in a subprocess so module mocks cannot leak into other Bun tests.
// All config, credentials, registry responses and optional side effects are synthetic.
import { mock } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const [consumer, scenario] = process.argv.slice(2)
const secret = "synthetic-secret-must-not-appear"
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "account-lookup-"))
const originalCwd = process.cwd()
const output: string[] = []
const errors: string[] = []
const requests: string[] = []
const effects: string[] = []
const token = scenario === "no-token" ? undefined : "synthetic-token"
const savedHandle = ["cached-503", "saved-session"].includes(scenario)
  ? "cached-user"
  : undefined
const config: Record<string, string | undefined> = {
  accountId: "account_fixture",
  sessionId: "session_fixture",
  tscircuitHandle: savedHandle,
}
if (token && scenario !== "saved-session") process.env.TSCIRCUIT_TOKEN = token
else delete process.env.TSCIRCUIT_TOKEN
process.env.TSCIRCUIT_CONFIG_DIR = path.join(tempDir, ".config")

const stop = new Error("STOP_AFTER_ACCOUNT_VALIDATION")
const exited = new Error("CONTROLLED_EXIT")
let exitCode = 0
let authorName: string | undefined
console.log = (...args) => output.push(args.join(" "))
console.info = (...args) => output.push(args.join(" "))
console.error = (...args) => errors.push(args.join(" "))
process.exit = ((code = 0) => {
  exitCode = Number(code)
  throw exited
}) as typeof process.exit

mock.module("lib/cli-config", () => ({
  cliConfig: { get: (key: string) => config[key] },
  getSessionToken: () => token,
  setSessionToken: () => {
    throw new Error("Unexpected token write")
  },
}))

const accountResponse = async () => {
  if (scenario === "throw-response-getter") {
    throw Object.defineProperty({}, "response", {
      get() {
        throw new Error(secret)
      },
    })
  }
  if (scenario === "throw-status-getter") {
    throw {
      response: Object.defineProperty({}, "status", {
        get() {
          throw new Error(secret)
        },
      }),
    }
  }
  if (scenario === "throw-prototype-proxy") {
    throw new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new Error(secret)
        },
      },
    )
  }
  if (scenario === "revoked-proxy") {
    const { proxy, revoke } = Proxy.revocable({}, {})
    revoke()
    throw proxy
  }
  const status = scenario.match(/(?:http-|cached-)(\d+)/)?.[1]
  if (status) {
    throw Object.assign(new Error(`session_expired ${secret}`), {
      response: { status: Number(status) },
      request: { headers: { Authorization: `Bearer ${secret}` } },
    })
  }
  if (scenario === "network") {
    throw new Error(`Failed to fetch https://example.invalid/?token=${secret}`)
  }
  if (scenario === "invalid-status") {
    throw Object.assign(new Error(secret), { response: { status: secret } })
  }
  if (scenario === "invalid-json") return new Response(secret).json()
  if (scenario === "missing-account") return {}
  if (scenario === "null-account") return { account: null }
  if (scenario === "array-account") return { account: [] }
  return {
    account: {
      account_id: "account_fixture",
      tscircuit_handle: scenario === "no-handle" ? null : "fixture-user",
      email: "fixture@example.invalid",
      created_at: "2026-01-01T00:00:00Z",
      personal_org_id: "org_fixture",
    },
  }
}

mock.module("lib/registry-api/get-ky", () => ({
  getRegistryApiKy: () => ({
    post: (url: string) => {
      requests.push(url)
      if (url !== "accounts/get") throw stop
      return { json: accountResponse }
    },
  }),
}))

const color: any = new Proxy(
  (...args: unknown[]) => (args.length ? args[0] : color),
  {
    get: () => color,
  },
)
mock.module("kleur", () => ({ default: color }))
mock.module("debug", () => ({ default: () => () => {} }))
mock.module("semver", () => ({ default: {} }))
mock.module("delay", () => ({ default: async () => {} }))
mock.module("jwt-decode", () => ({ jwtDecode: () => ({}) }))
mock.module("cli/auth/setup-npmrc/setup-npmrc", () => ({
  setupNpmrc: () => {
    throw new Error("Unexpected npmrc write")
  },
}))
mock.module("lib/shared/get-entrypoint", () => ({
  getEntrypoint: async () => undefined,
}))
mock.module("lib/utils/prompts", () => ({
  default: async () => {
    throw new Error("Unexpected prompt")
  },
  prompts: async () => {
    throw new Error("Unexpected prompt")
  },
}))
mock.module("lib/utils/get-unscoped-package-name", () => ({
  getUnscopedPackageName: () => "fixture-package",
}))
mock.module("lib/utils/get-package-author", () => ({
  getPackageAuthor: () => "fixture-user",
}))
mock.module("lib/utils/validate-package-name", () => ({
  validatePackageName: () => undefined,
}))
mock.module("lib/dev/get-package-file-paths", () => ({
  getPackageFilePaths: () => {
    throw new Error("Unexpected upload")
  },
}))
mock.module("lib/shared/is-binary-file", () => ({ isBinaryFile: () => false }))
mock.module("lib/shared/has-binary-content", () => ({
  hasBinaryContent: () => false,
}))
mock.module("lib/shared/check-for-cli-update", () => ({
  checkForTsciUpdates: async () => {},
}))
mock.module("lib/shared/setup-tsci-packages", () => ({
  setupTsciProject: async () => {
    effects.push("init:setup")
  },
}))
mock.module("lib/shared/setup-tscircuit-skill", () => ({
  setupTscircuitSkill: async () => {},
}))
mock.module("lib/shared/generate-ts-config", () => ({
  generateTsConfig: () => {},
}))
mock.module("lib/shared/generate-gitignore-file", () => ({
  generateGitIgnoreFile: () => {},
}))
mock.module("lib/shared/write-file-if-not-exists", () => ({
  writeFileIfNotExists: (file: string, content: string) => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, content)
  },
}))
mock.module("lib/shared/generate-package-json", () => ({
  generatePackageJson: (_dir: string, opts: { authorName?: string }) => {
    authorName = opts.authorName
    effects.push("init:package")
  },
}))
mock.module("lib/project-config", () => ({ saveProjectConfig: () => true }))
mock.module("lib/telemetry", () => ({ captureTelemetryEvent: async () => {} }))

let action: (...args: any[]) => Promise<unknown>
const chain: any = {
  command: () => chain,
  description: () => chain,
  argument: () => chain,
  option: () => chain,
  action: (fn: typeof action) => {
    action = fn
    return chain
  },
  commands: [{ name: () => "auth", command: () => chain }],
}
const manifest = JSON.stringify({
  name: "@tsci/fixture-user.fixture-package",
  version: "1.0.0",
})
fs.writeFileSync(path.join(tempDir, "package.json"), manifest)
process.chdir(tempDir)
let value: unknown
let caught: string | undefined
let stopped = false
try {
  if (consumer === "helper") {
    value = await (
      await import("lib/registry-api/fetch-account")
    ).fetchAccount()
  } else if (consumer === "push") {
    await (await import("lib/shared/push-snippet")).pushSnippet({
      onError: (message) => errors.push(message),
      onExit: (code) => {
        exitCode = code
      },
    })
  } else {
    if (consumer === "whoami")
      (await import("cli/auth/whoami/register")).registerAuthWhoami(chain)
    if (consumer === "login")
      (await import("cli/auth/login/register")).registerAuthLogin(chain)
    if (consumer === "init")
      (await import("cli/init/register")).registerInit(chain)
    await action!(undefined, { yes: true, install: false })
  }
} catch (error) {
  if (error === stop) stopped = true
  else if (error !== exited) caught = String(error)
}
const manifestUnchanged =
  fs.readFileSync(path.join(tempDir, "package.json"), "utf8") === manifest
exitCode = Number(process.exitCode ?? exitCode)
process.exitCode = 0
process.chdir(originalCwd)
fs.rmSync(tempDir, { recursive: true, force: true })
process.stdout.write(
  JSON.stringify({
    value,
    caught,
    stopped,
    exitCode,
    output,
    errors,
    requests,
    effects,
    authorName,
    manifestUnchanged,
  }),
)
