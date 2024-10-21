import { expect, test } from "bun:test"
import { existsSync, readFileSync } from "fs"
import { $ } from "bun"
import { join } from "path/posix"
import { temporaryDirectory } from "tempy"

test("tsci export bom_csv --input example-project/examples/macrokeypad.tsx", async () => {
  const tempDir = temporaryDirectory()
  const bomCsvPath = join(tempDir, "bom.csv")
  const { stdout, stderr } =
    await $`bun cli/cli.ts export bom_csv --input example-project/examples/macrokeypad.tsx --outputfile ${bomCsvPath} --no-color`

  expect(stderr.toString()).toBe("")
  expect(stdout.toString()).toContain("bom.csv")

  expect(existsSync(bomCsvPath)).toBe(true)

  const bomCsvContent = readFileSync(bomCsvPath, "utf-8")
  expect(bomCsvContent).toContain("Designator")
  expect(bomCsvContent).toContain("Comment")
  expect(bomCsvContent).toContain("Value")
  expect(bomCsvContent).toContain("Footprint")
  expect(bomCsvContent).toContain("JLCPCB Part#")
  expect(bomCsvContent).toContain("pcb_component_0")
})
