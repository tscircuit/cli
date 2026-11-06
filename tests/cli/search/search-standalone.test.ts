import { expect, test } from "bun:test"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { gzipSync } from "node:zlib"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const preload = path.resolve("tests/fixtures/offline-search-preload.ts")

test("all default sources search compressed catalogs with external fetch blocked", async () => {
  const fixture = await getCliTestFixture({ preload })
  const directory = path.join(fixture.tmpDir, "baked")
  for (const [provider, source] of Object.entries({
    jlcsearch: "jlcpcb",
    ti: "ti",
    digikey: "digikey",
    mouser: "mouser",
    kicad: "kicad",
    tscircuit: "tscircuit",
  })) {
    await mkdir(path.join(directory, provider), { recursive: true })
    await writeFile(
      path.join(directory, provider, "search-catalog.json.gz"),
      gzipSync(
        JSON.stringify({
          schema_version: 1,
          source,
          coverage: "subset",
          generated_at: "2026-11-06T00:00:00.000Z",
          ...(source === "kicad"
            ? { files: ["Package.pretty/TPS63001.kicad_mod"] }
            : source === "tscircuit"
              ? { packages: [{ name: "test/TPS63001", version: "1.0.0" }] }
              : {
                  components: [
                    {
                      mfr: "TPS63001DRCT",
                      lcsc: 123,
                      description: "Buck boost converter",
                      package: "VSON",
                      stock: 42,
                      price: 1,
                    },
                  ],
                }),
        }),
      ),
    )
  }
  await mkdir(path.join(directory, "datasheet-api/datasheets"), {
    recursive: true,
  })
  await writeFile(
    path.join(directory, "datasheet-api/datasheets/list"),
    JSON.stringify({
      datasheets: [{ datasheet_id: "tps", chip_name: "TPS63001" }],
    }),
  )
  // Fixture forwards environment at command launch. Use an isolated preload to
  // configure the directory without leaking these settings into other tests.
  const setup = path.join(fixture.tmpDir, "offline-setup.ts")
  await writeFile(
    setup,
    `import ${JSON.stringify(preload)}\nprocess.env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR = ${JSON.stringify(directory)}\n`,
  )
  const env = {
    ...process.env,
    TSCI_TEST_MODE: "true",
    TSCI_SKIP_CLI_UPDATE: "true",
    TSCI_SKIP_ACCOUNT_FETCH: "true",
    TSCI_SKIP_SKILL_SETUP: "true",
    TSCIRCUIT_DEFAULT_SEARCH_SOURCES:
      "kicad,jlcpcb,ti,digikey,mouser,tscircuit,datasheets",
  }
  const command = Bun.spawn(
    [
      process.execPath,
      "--preload",
      setup,
      path.resolve("cli/main.ts"),
      "search",
      "tps63001",
      "--json",
    ],
    {
      cwd: fixture.tmpDir,
      env,
      stdout: "pipe",
      stderr: "pipe",
    },
  )
  const [stdout, stderr, code] = await Promise.all([
    new Response(command.stdout).text(),
    new Response(command.stderr).text(),
    command.exited,
  ])
  expect(stderr).toBe("")
  expect(code).toBe(0)
  const result = JSON.parse(stdout)
  expect(result.errors).toBeUndefined()
  expect(
    result.results.map((row: { source: string }) => row.source).sort(),
  ).toEqual([
    "datasheets",
    "digikey",
    "jlcpcb",
    "kicad",
    "mouser",
    "ti",
    "tscircuit",
  ])
  expect(result.catalogs).toHaveLength(6)
  expect(
    result.catalogs.every(
      (catalog: { coverage: string }) => catalog.coverage === "subset",
    ),
  ).toBe(true)
  const imported = Bun.spawn(
    [
      process.execPath,
      "--preload",
      setup,
      path.resolve("cli/main.ts"),
      "import",
      "--jlcpcb",
      "not-a-bundled-part",
    ],
    {
      cwd: fixture.tmpDir,
      env,
      stdout: "pipe",
      stderr: "pipe",
    },
  )
  const [importOutput, importErrors, importCode] = await Promise.all([
    new Response(imported.stdout).text(),
    new Response(imported.stderr).text(),
    imported.exited,
  ])
  expect(importCode).toBe(0)
  expect(importErrors).toBe("")
  expect(importOutput).toContain("bundled JLCPCB subset")
  expect(importOutput).toContain(
    "https://jlcsearch.tscircuit.com/components/list?search=not-a-bundled-part",
  )
}, 20_000)
