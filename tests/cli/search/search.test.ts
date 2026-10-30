import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const preload = resolve("tests/fixtures/search-api-preload.ts")

test("default search combines all sources in JSON and groups terminal results", async () => {
  const { runCommand } = await getCliTestFixture({ preload })
  const result = await runCommand("tsci search --json 555")
  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe("")
  const { results } = JSON.parse(result.stdout)
  expect([
    ...new Set(results.map((part: { source: string }) => part.source)),
  ]).toEqual([
    "datasheets",
    "kicad",
    "tscircuit",
    "ti",
    "digikey",
    "mouser",
    "jlcpcb",
  ])

  const terminal = await runCommand("tsci search 555")
  expect(terminal.exitCode).toBe(0)
  expect(terminal.stderr).toBe("")
  for (const label of [
    "datasheet catalog",
    "KiCad",
    "tscircuit registry",
    "TI search",
    "DigiKey",
    "Mouser",
    "JLC search",
  ])
    expect(terminal.stdout).toContain(label)
}, 20_000)

test("search preserves partial results and fails when the selected source is unavailable", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({ preload })
  await writeFile(
    join(tmpDir, "search-fixture.json"),
    JSON.stringify({ failMouser: true }),
  )
  const partial = await runCommand("tsci search --json 555")
  expect(partial.exitCode).toBe(0)
  const { results, errors } = JSON.parse(partial.stdout)
  expect(
    new Set(results.map((part: { source: string }) => part.source)).size,
  ).toBe(6)
  expect(errors).toEqual([
    { source: "mouser", message: "Mouser search failed (HTTP 503)" },
  ])
  expect(partial.stderr).toContain("mouser")

  const failed = await runCommand("tsci search --mouser 555")
  expect(failed.exitCode).toBe(1)
  expect(failed.stdout).toBe("")
  expect(failed.stderr).toContain("Mouser search failed (HTTP 503)")
}, 20_000)
