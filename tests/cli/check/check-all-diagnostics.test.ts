import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("check prints diagnostics from every category including unknown", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitJsonPath = path.join(tmpDir, "all-diagnostics.circuit.json")
  const diagnosticTypes = [
    "source_property_ignored_warning",
    "source_pin_must_be_connected_error",
    "pcb_component_outside_board_error",
    "pcb_trace_error",
    "source_no_power_pin_defined_warning",
    "future_diagnostic_warning",
  ]

  await writeFile(
    circuitJsonPath,
    JSON.stringify(
      diagnosticTypes.map((type) => ({
        type,
        message: `Diagnostic for ${type}`,
      })),
    ),
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check ${circuitJsonPath}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("Errors: 3")
  expect(stdout).toContain("Warnings: 3")

  for (const type of diagnosticTypes) {
    expect(stdout).toContain(type)
  }
})
