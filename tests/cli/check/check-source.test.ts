import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("check source prints only source diagnostics", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitJsonPath = path.join(tmpDir, "source-warning.circuit.json")

  await writeFile(
    circuitJsonPath,
    JSON.stringify([
      {
        type: "source_property_ignored_warning",
        error_type: "source_property_ignored_warning",
        message: "Source property was ignored",
      },
      {
        type: "source_pin_must_be_connected_error",
        error_type: "source_pin_must_be_connected_error",
        message: "Pin must be connected",
      },
      {
        type: "pcb_trace_error",
        error_type: "pcb_trace_error",
        message: "Trace failed",
      },
    ]),
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check source ${circuitJsonPath}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("Errors: 0")
  expect(stdout).toContain("Warnings: 1")
  expect(stdout).toContain("source_property_ignored_warning")
  expect(stdout).not.toContain("source_pin_must_be_connected_error")
  expect(stdout).not.toContain("pcb_trace_error")
})
