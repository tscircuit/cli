import { expect, test } from "bun:test"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

test("search finds baked datasheets by name and supplier number and shows import availability", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const directory = path.join(tmpDir, "baked")
  const api = path.join(directory, "datasheet-api/datasheets")
  await mkdir(path.join(api, "get"), { recursive: true })
  const datasheets = [
    {
      datasheet_id: "rp2040",
      chip_name: "RP2040",
      supplier_part_numbers: { jlcpcb: ["C2040"] },
      generated_tsx: "export const RP2040 = () => <chip />",
    },
    {
      datasheet_id: "msp430",
      chip_name: "MSP430F5229",
      generated_tsx: null,
    },
  ]
  await writeFile(path.join(api, "list"), JSON.stringify({ datasheets }))
  for (const datasheet of datasheets) {
    await writeFile(
      path.join(api, "get", `datasheet_id%3D${datasheet.datasheet_id}.json`),
      JSON.stringify({ datasheet }),
    )
  }
  const previous = process.env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR
  globalThis.deferredCleanupFns.push(async () => {
    if (previous === undefined)
      delete process.env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR
    else process.env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR = previous
  })
  process.env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR = directory

  for (const [query, mfr, canImport] of [
    ["rp2040", "RP2040", true],
    ["C2040", "RP2040", true],
    ["MSP", "MSP430F5229", false],
  ] as const) {
    const { stdout, stderr, exitCode } = await runCommand(
      `tsci search --json ${query}`,
    )
    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    expect(JSON.parse(stdout).results).toContainEqual(
      expect.objectContaining({
        source: "datasheet",
        mfr,
        can_import: canImport,
      }),
    )
  }
  const missing = await runCommand(
    "tsci search --json NOT_A_REAL_PART_987654321",
  )
  expect(missing.exitCode).toBe(0)
  expect(JSON.parse(missing.stdout).results).toEqual([])
  const text = await runCommand("tsci search MSP")
  expect(text.stdout).toContain("MSP430F5229 (not available to import)")
}, 20_000)
