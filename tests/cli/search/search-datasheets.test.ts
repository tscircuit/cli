import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

test("--datasheets narrows the search and matches chip names literally", async () => {
  const { runCommand } = await getCliTestFixture({
    preload: resolve("tests/fixtures/search-api-preload.ts"),
  })
  const matched = await runCommand("tsci search --datasheets --json nE555")
  expect(matched.exitCode).toBe(0)
  expect(matched.stderr).toBe("")
  const { results } = JSON.parse(matched.stdout)
  expect(
    results.map((part: { source: string; chip_name: string }) => [
      part.source,
      part.chip_name,
    ]),
  ).toEqual([
    ["datasheets", "NE555"],
    ["datasheets", "A-NE555"],
    ["datasheets", "NE555P"],
  ])

  const missing = await runCommand("tsci search --datasheets --json NE557")
  expect(missing.exitCode).toBe(0)
  expect(missing.stderr).toBe("")
  expect(JSON.parse(missing.stdout).results).toEqual([])
}, 20_000)
