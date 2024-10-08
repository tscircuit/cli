import { test, expect } from "bun:test"
import { $ } from "bun"
import { temporaryDirectory } from "tempy"
import { join } from "path/posix"
import { existsSync, readFileSync } from "fs"

test("tsci export pnp_csv --input example-project/examples/macrokeypad.tsx", async () => {
  const tempDir = temporaryDirectory()
  const pnpCsvPath = join(tempDir, "pnp.csv")
  const { stdout, stderr } =
    await $`bun cli/cli.ts export pnp_csv --input example-project/examples/macrokeypad.tsx --outputfile ${pnpCsvPath} --no-color`

  expect(stderr.toString()).toBe("")
  expect(stdout.toString()).toContain("pnp.csv")

  expect(existsSync(pnpCsvPath)).toBe(true)

  const pnpCsvContent = readFileSync(pnpCsvPath, "utf-8")
  expect(pnpCsvContent).toContain("Designator")
  expect(pnpCsvContent).toContain("Mid X")
  expect(pnpCsvContent).toContain("Mid Y")
  expect(pnpCsvContent).toContain("Layer")
  expect(pnpCsvContent).toContain("Rotation")
})
