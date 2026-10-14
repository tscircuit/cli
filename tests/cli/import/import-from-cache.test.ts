import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { createLocalCacheEngine } from "lib/shared/get-platform-config-with-cli-defaults"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const componentSource =
  'export default () => <chip footprint="soic8" pinAttributes={{ pin1: { requiresPower: true } }} />\n'
const datasheet = {
  datasheet_id: "test-rp2040",
  chip_name: "RP2040",
  pin_attributes: { pin1: { requiresPower: true } },
  generated_tsx: componentSource,
}

const getCacheFixture = async () => {
  const { tmpDir } = await getCliTestFixture()
  const cacheDir = path.join(tmpDir, ".cache")
  const cache = createLocalCacheEngine(cacheDir)
  cache.setItem(
    "datasheets:index:v1",
    JSON.stringify({
      rp2040: datasheet.datasheet_id,
      c2040: datasheet.datasheet_id,
    }),
  )
  cache.setItem(
    `datasheet:${datasheet.datasheet_id}`,
    JSON.stringify({ datasheet }),
  )
  const preload = path.join(tmpDir, "no-fetch.ts")
  // A distinct exit code also catches fetch attempts swallowed by the CLI.
  await writeFile(preload, "globalThis.fetch = () => process.exit(99)\n")

  const runImport = async (
    args: string[],
    env: Record<string, string | undefined> = {},
  ) => {
    const command = Bun.spawn(
      [
        "bun",
        "--preload",
        preload,
        path.resolve("cli/main.ts"),
        "import",
        ...args,
      ],
      {
        cwd: tmpDir,
        env: {
          ...process.env,
          TSCI_TEST_MODE: "true",
          TSCIRCUIT_CONFIG_DIR: path.join(tmpDir, ".config"),
          TSCIRCUIT_IMPORT_CACHE_DIR: cacheDir,
          TSCIRCUIT_STANDALONE: "1",
          ...env,
        },
        stdout: "pipe",
        stderr: "pipe",
      },
    )
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(command.stdout).text(),
      new Response(command.stderr).text(),
      command.exited,
    ])
    return { stdout, stderr, exitCode }
  }

  return { tmpDir, cache, preload, runImport }
}

for (const query of ["rp2040", "C2040", "2040"]) {
  test(`tsci import ${query} writes cached TSX with pin attributes without fetching`, async () => {
    const { tmpDir, runImport } = await getCacheFixture()
    const { stdout, stderr, exitCode } = await runImport([query], {
      TSCIRCUIT_STANDALONE: query === "rp2040" ? "0" : "1",
    })
    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    expect(stdout).toContain("Imported")
    expect(
      await readFile(path.join(tmpDir, "imports/RP2040.tsx"), "utf8"),
    ).toBe(componentSource)
  })
}

test("standalone import fails on a cache miss without fetching", async () => {
  const { runImport } = await getCacheFixture()
  const { stderr, exitCode } = await runImport(["UNKNOWN"])
  expect(exitCode).toBe(1)
  expect(stderr).toContain(
    'Part "UNKNOWN" is not included in the standalone cache',
  )
})

test("standalone import requires a cache directory without fetching", async () => {
  const { runImport } = await getCacheFixture()
  const { stderr, exitCode } = await runImport(["RP2040"], {
    TSCIRCUIT_IMPORT_CACHE_DIR: undefined,
  })
  expect(exitCode).toBe(1)
  expect(stderr).toContain(
    "Standalone import requires TSCIRCUIT_IMPORT_CACHE_DIR",
  )
})

test("cached import rejects a response without component TSX", async () => {
  const { cache, runImport } = await getCacheFixture()
  cache.setItem(
    `datasheet:${datasheet.datasheet_id}`,
    JSON.stringify({ datasheet: { ...datasheet, generated_tsx: null } }),
  )
  const { stderr, exitCode } = await runImport(["RP2040"])
  expect(exitCode).toBe(1)
  expect(stderr).toContain('Invalid cached datasheet for "RP2040"')
})

test("cached import rejects a record that does not match the index", async () => {
  const { cache, runImport } = await getCacheFixture()
  cache.setItem(
    `datasheet:${datasheet.datasheet_id}`,
    JSON.stringify({
      datasheet: { ...datasheet, datasheet_id: "another-part" },
    }),
  )
  const { stderr, exitCode } = await runImport(["RP2040"])
  expect(exitCode).toBe(1)
  expect(stderr).toContain('Invalid cached datasheet for "RP2040"')
})

test("standalone import rejects options requiring a different component without fetching", async () => {
  const { runImport } = await getCacheFixture()
  const { stderr, exitCode } = await runImport(["RP2040", "--download"])
  expect(exitCode).toBe(1)
  expect(stderr).toContain("Standalone import supports cached component TSX")
})

test("regular import continues its online search on a cache miss", async () => {
  const { preload, runImport } = await getCacheFixture()
  await writeFile(
    preload,
    "globalThis.fetch = async () => Response.json({ components: [] })\n",
  )
  const { stdout, exitCode } = await runImport(["UNKNOWN"], {
    TSCIRCUIT_STANDALONE: "0",
  })
  expect(exitCode).toBe(0)
  expect(stdout).toContain('No results found for "UNKNOWN"')
})
