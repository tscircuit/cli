import { afterEach, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { join, resolve } from "node:path"
import { tmpdir } from "node:os"
import { createDependencyBundle } from "../../fixtures/create-dependency-bundle"

const directories: string[] = []
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

test("init, install, add and unavailable packages never call fetch or a package manager", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "standalone-cli-"))
  directories.push(cwd)
  const bundle = join(cwd, "bundle.zip")
  await createDependencyBundle(bundle)
  const attempts = join(cwd, "network-attempts")
  const run = async (...args: string[]) => {
    const child = Bun.spawn(
      [
        process.execPath,
        "--preload",
        resolve("tests/fixtures/offline-network-preload.ts"),
        resolve("cli/main.ts"),
        ...args,
      ],
      {
        cwd,
        env: {
          ...process.env,
          // No package manager can be discovered or run in the child.
          PATH: "",
          TSCIRCUIT_CONFIG_DIR: join(cwd, "config"),
          TSCIRCUIT_STANDALONE: "1",
          TSCIRCUIT_DEPENDENCY_BUNDLE: bundle,
          TSCI_NETWORK_ATTEMPTS: attempts,
          TSCIRCUIT_TOKEN: "test-token",
          TSCI_TEST_MODE: "false",
          TSCI_TELEMETRY_FORCE: "true",
          TSCI_TELEMETRY_DISABLED: "false",
          TSCI_SKIP_SKILL_SETUP: "false",
          TSCI_SKIP_ACCOUNT_FETCH: "false",
          TSCI_SKIP_CLI_UPDATE: "false",
        },
        stdout: "pipe",
        stderr: "pipe",
      },
    )
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    return { code, stdout, stderr }
  }
  const init = await run("init", "--yes")
  expect(init.code, init.stderr).toBe(0)
  expect(init.stdout).toContain("standalone bundle (offline)")
  await rm(join(cwd, "node_modules"), { recursive: true })
  const install = await run("install")
  expect(install.code, install.stderr).toBe(0)
  const add = await run("install", "typescript@^5")
  expect(add.code, add.stderr).toBe(0)
  const missing = await run("install", "not-in-the-bundle")
  expect(missing.code).toBe(1)
  expect(missing.stderr).toContain("No registry request")
  const url = await run("install", "https://example.com/test.tgz")
  expect(url.code).toBe(1)
  expect(await Bun.file(attempts).exists()).toBe(false)
}, 60_000)
