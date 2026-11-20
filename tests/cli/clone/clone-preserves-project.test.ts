import { expect, test } from "bun:test"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import ky from "ky"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const setup = async ({ invalidLockfile = false } = {}) => {
  const fixture = await getCliTestFixture({
    loggedIn: true,
    env: { npm_config_user_agent: `bun/${Bun.version}` },
  })
  const localDependency = path.join(fixture.tmpDir, "local-tscircuit")
  const source = path.join(fixture.tmpDir, "source")
  mkdirSync(localDependency)
  mkdirSync(source)
  writeFileSync(
    path.join(localDependency, "package.json"),
    JSON.stringify({ name: "tscircuit", version: "0.0.1" }),
  )
  const manifest = `${JSON.stringify(
    {
      name: "@tsci/test-user.preserved-board",
      version: "1.0.0",
      scripts: { dev: "bun scripts/dev.ts", start: "bun scripts/start.ts" },
      devDependencies: { tscircuit: `file:${localDependency}` },
    },
    null,
    4,
  )}\n`
  writeFileSync(path.join(source, "package.json"), manifest)
  const install = Bun.spawnSync([process.execPath, "install"], {
    cwd: source,
    stdout: "pipe",
    stderr: "pipe",
  })
  expect(install.exitCode, install.stderr.toString()).toBe(0)
  let lockfile = readFileSync(path.join(source, "bun.lock"), "utf8")
  if (invalidLockfile) {
    lockfile = lockfile.replace(
      /"lockfileVersion":\s*\d+/,
      '"lockfileVersion": 999',
    )
    expect(lockfile).toContain('"lockfileVersion": 999')
  }
  const files = {
    "package.json": manifest,
    "bun.lock": lockfile,
    ".npmrc": "@tsci:registry=https://npm.tscircuit.com\nsave-exact=true\n",
    "tsconfig.json": '{ "compilerOptions": { "strict": true } }\n',
  }
  const registry = ky.create({
    prefixUrl: fixture.registryApiUrl,
    headers: {
      Authorization: `Bearer ${fixture.registryDb.accounts[0].account_id}`,
    },
  })
  await registry.post("packages/create", {
    json: { name: "test-user/preserved-board", is_private: false },
  })
  await registry.post("package_releases/create", {
    json: { package_name_with_version: "test-user/preserved-board@1.0.0" },
  })
  for (const [file_path, content_text] of Object.entries(files)) {
    await registry.post("package_files/create", {
      json: {
        package_name_with_version: "test-user/preserved-board@1.0.0",
        file_path,
        content_text,
      },
    })
  }
  return { ...fixture, files }
}

test("clone preserves published scripts, dependency versions, lockfile and configuration", async () => {
  const { tmpDir, runCommand, files } = await setup()
  const { stdout, exitCode } = await runCommand(
    "tsci clone test-user/preserved-board",
  )
  expect(exitCode).toBe(0)
  const destination = path.join(tmpDir, "preserved-board")
  const actual = Object.fromEntries(
    Object.keys(files).map((name) => [
      name,
      readFileSync(path.join(destination, name), "utf8"),
    ]),
  )
  expect(actual).toEqual(files)
  expect(stdout).toContain("Dependencies installed successfully")
  expect(
    JSON.parse(
      readFileSync(
        path.join(destination, "node_modules/tscircuit/package.json"),
        "utf8",
      ),
    ).version,
  ).toBe("0.0.1")
}, 30_000)

test("clone does not repair an invalid published lockfile by upgrading dependencies", async () => {
  const { tmpDir, runCommand, files } = await setup({
    invalidLockfile: true,
  })
  const { stdout, stderr, exitCode } = await runCommand(
    "tsci clone test-user/preserved-board",
  )
  expect(exitCode).toBe(0)
  expect(`${stdout}\n${stderr}`).toContain("frozen-lockfile")
  expect(`${stdout}\n${stderr}`).toContain(
    "Failed to automatically install dependencies",
  )
  for (const name of ["package.json", "bun.lock"] as const) {
    expect(
      readFileSync(path.join(tmpDir, "preserved-board", name), "utf8"),
    ).toBe(files[name])
  }
}, 30_000)
