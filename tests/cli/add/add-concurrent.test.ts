import { expect, test } from "bun:test"
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

const cliPath = path.resolve("cli/main.ts")

async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), "tsci-add-concurrent-"))
  globalThis.deferredCleanupFns.push(() =>
    rm(dir, { recursive: true, force: true }),
  )
  const bin = path.join(dir, "bin")
  await mkdir(bin)
  await writeFile(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "test", dependencies: {} }),
  )
  await writeFile(path.join(dir, "package-lock.json"), "{}")
  // Fail deterministically if package managers overlap, without any network.
  await writeFile(
    path.join(bin, "npm"),
    `#!/usr/bin/env bun
import fs from "node:fs"
const name = process.argv.at(-1)
if (name === "fail-install") process.exit(1)
fs.mkdirSync("active-install")
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"))
await Bun.sleep(Number(process.env.INSTALL_DELAY_MS || 100))
pkg.dependencies[name] = "1.0.0"
fs.writeFileSync("package.json", JSON.stringify(pkg))
fs.writeFileSync("package-lock.json", JSON.stringify(pkg))
fs.mkdirSync("node_modules/" + name, { recursive: true })
fs.rmdirSync("active-install")
`,
  )
  await chmod(path.join(bin, "npm"), 0o755)
  const runner = path.join(dir, "run-cli.ts")
  // Bun sets its own npm user agent at startup; select the stub afterwards.
  await writeFile(
    runner,
    `
process.env.npm_config_user_agent = "npm/test"
process.argv = [process.execPath, ${JSON.stringify(cliPath)}, "add", process.argv[2]]
await import(${JSON.stringify(cliPath)})
`,
  )
  const start = (name: string, delay = 100, cwd = dir) => {
    const child = Bun.spawn([process.execPath, runner, name], {
      cwd,
      env: {
        ...process.env,
        PATH: `${bin}${path.delimiter}${process.env.PATH}`,
        npm_config_user_agent: "npm/test",
        TSCI_TEST_MODE: "true",
        TSCIRCUIT_CONFIG_DIR: path.join(dir, ".config"),
        INSTALL_DELAY_MS: String(delay),
      },
      stdout: "pipe",
      stderr: "pipe",
    })
    return Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
  }
  return { dir, start }
}

test("concurrent add processes serialize across a long install and symlinked cwd", async () => {
  const { dir, start } = await fixture()
  const alias = `${dir}-alias`
  await symlink(dir, alias, "dir")
  globalThis.deferredCleanupFns.push(() => rm(alias, { force: true }))
  // Longer than the stale threshold: the installer must not block heartbeats.
  const first = start("first", 12000)
  const deadline = Date.now() + 10000
  while (!(await stat(path.join(dir, "active-install")).catch(() => null))) {
    if (Date.now() > deadline)
      throw Error("First package manager did not start")
    await Bun.sleep(50)
  }
  const results = await Promise.all([
    first,
    start("second"),
    start("third", 100, alias),
  ])
  for (const [code, stdout, stderr] of results) {
    expect({ code, output: `${stdout}${stderr}` }).toMatchObject({ code: 0 })
  }
  const expected = { first: "1.0.0", second: "1.0.0", third: "1.0.0" }
  for (const file of ["package.json", "package-lock.json"]) {
    expect(
      JSON.parse(await readFile(path.join(dir, file), "utf8")).dependencies,
    ).toEqual(expected)
  }
  expect(
    await stat(path.join(dir, ".tscircuit/add.lock")).catch(() => null),
  ).toBeNull()
}, 40000)

test("failed add releases the project lock", async () => {
  const { dir, start } = await fixture()
  expect((await start("fail-install"))[0]).toBe(1)
  expect((await start("after-failure"))[0]).toBe(0)
  expect(
    await stat(path.join(dir, ".tscircuit/add.lock")).catch(() => null),
  ).toBeNull()
}, 15000)

test("add recovers a stale lock left by an interrupted process", async () => {
  const { dir, start } = await fixture()
  const lock = path.join(dir, ".tscircuit/add.lock")
  await mkdir(lock, { recursive: true })
  const old = new Date(Date.now() - 60000)
  await utimes(lock, old, old)
  expect((await start("after-interruption"))[0]).toBe(0)
}, 15000)
