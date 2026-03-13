import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const drcFixture = [
  {
    type: "pcb_component_outside_board_error",
    message: "placement issue",
  },
  {
    error_type: "pcb_trace_error",
    message: "routing issue",
  },
  {
    warning_type: "source_no_power_pin_defined_warning",
    message: "pin specification issue",
  },
  {
    error_type: "source_pin_must_be_connected_error",
    message: "netlist issue",
  },
]

const getBuildSummarySnippet = (stdout: string) => {
  const lines = stdout
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
  const summaryStartIndex = lines.findIndex((line) => line === "Build complete")
  if (summaryStartIndex === -1) return ""
  const summaryLines = lines.slice(summaryStartIndex)
  const exitLineIndex = summaryLines.findIndex((line) =>
    line.startsWith("Build exiting with code"),
  )
  return summaryLines
    .slice(0, exitLineIndex >= 0 ? exitLineIndex + 1 : summaryLines.length)
    .join("\n")
}

test("build reports ignored counts when selected DRC categories are filtered", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(
    path.join(tmpDir, "board.circuit.json"),
    JSON.stringify(drcFixture),
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stdout } = await runCommand(
    "tsci build board.circuit.json --ignore-placement-drc --ignore-routing-drc",
  )

  expect(exitCode).toBe(0)
  expect(getBuildSummarySnippet(stdout)).toMatchInlineSnapshot(`
"Build complete
  Circuits  1 passed
  Options   ignore-placement-drc, ignore-routing-drc
  Output    dist
  Ignored DRC 2 (placement: 1, routing: 1)
⚠ Build completed with errors
Build exiting with code 0: build finished successfully"
`)
}, 30_000)

test("build can suppress all known DRC categories", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(
    path.join(tmpDir, "board.circuit.json"),
    JSON.stringify(drcFixture),
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stdout } = await runCommand(
    "tsci build board.circuit.json --ignore-netlist-drc --ignore-pin-specification-drc --ignore-placement-drc --ignore-routing-drc",
  )

  expect(exitCode).toBe(0)
  expect(getBuildSummarySnippet(stdout)).toMatchInlineSnapshot(`
"Build complete
  Circuits  1 passed
  Options   ignore-netlist-drc, ignore-pin-specification-drc, ignore-placement-drc, ignore-routing-drc
  Output    dist
  Ignored DRC 4 (netlist: 1, pin_specification: 1, placement: 1, routing: 1)
✓ Done
Build exiting with code 0: build finished successfully"
`)
}, 30_000)
