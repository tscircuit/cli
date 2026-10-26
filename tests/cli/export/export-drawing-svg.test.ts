import "bun-match-svg"
import { expect, test } from "bun:test"
import { copyFile, readFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("export selects a drawing by name or SVG filename and honors --output", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuit = path.join(tmpDir, "carrier.circuit.json")
  await copyFile(
    path.join(import.meta.dir, "../../fixtures/drawings/carrier.circuit.json"),
    circuit,
  )
  const named = await runCommand(
    `tsci export ${circuit} --format drawing-svg --drawing carrier-plan`,
  )
  expect(named.exitCode, named.stderr).toBe(0)
  const svg = await readFile(path.join(tmpDir, "carrier-plan.svg"), "utf8")
  expect(svg).toContain("<svg")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
  expect(svg).toContain('data-drawing-part-view-id="plan-view"')
  expect(svg).not.toContain('data-drawing-part-view-id="side-view"')
  const output = path.join(tmpDir, "inspection.svg")
  const filename = await runCommand(
    `tsci export ${circuit} --drawing carrier-side.svg --output ${output}`,
  )
  expect(filename.exitCode, filename.stderr).toBe(0)
  expect(await readFile(output, "utf8")).toContain(
    'data-drawing-part-view-id="side-view"',
  )
  const missing = await runCommand(`tsci export ${circuit} --drawing missing`)
  expect(missing.exitCode).not.toBe(0)
  expect(missing.stderr).toContain("not found")
  const ambiguous = await runCommand(
    `tsci export ${circuit} --format drawing-svg`,
  )
  expect(ambiguous.exitCode).not.toBe(0)
  expect(ambiguous.stderr).toContain("--drawing")
}, 60_000)
