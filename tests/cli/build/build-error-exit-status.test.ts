import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const traceError = {
  type: "source_trace_not_connected_error",
  error_type: "source_trace_not_connected_error",
  message: 'Could not find port for selector "R_MISSING.pin1"',
  selectors_not_found: ["R_MISSING.pin1"],
}
const warning = {
  type: "source_no_power_pin_defined_warning",
  warning_type: "source_no_power_pin_defined_warning",
  message: "No power pin defined",
}

for (const concurrency of [1, 2]) {
  test(`build retains all circuits and counts errors as failures with concurrency ${concurrency}`, async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    await writeFile(path.join(tmpDir, "package.json"), "{}")
    for (const [name, circuit] of Object.entries({
      bad: [traceError],
      good: [],
      warning: [warning],
    })) {
      await writeFile(
        path.join(tmpDir, `${name}.circuit.json`),
        JSON.stringify(circuit),
      )
    }

    const { exitCode, stdout } = await runCommand(
      `tsci build --concurrency ${concurrency}`,
    )
    expect(exitCode).toBe(1)
    expect(stdout).toContain("2 passed 1 failed")
    expect(stdout).toContain("Build completed with errors")
    expect(stdout).not.toContain("build finished successfully")
    for (const [name, circuit] of Object.entries({
      bad: [traceError],
      good: [],
      warning: [warning],
    })) {
      expect(
        JSON.parse(
          await readFile(
            path.join(tmpDir, "dist", name, "circuit.json"),
            "utf-8",
          ),
        ),
      ).toEqual(circuit)
    }
  }, 30_000)

  for (const ignoreErrors of [false, true]) {
    test(`build exits 0 for ${ignoreErrors ? "ignored errors" : "warnings only"} with concurrency ${concurrency}`, async () => {
      const { tmpDir, runCommand } = await getCliTestFixture()
      await writeFile(path.join(tmpDir, "package.json"), "{}")
      await writeFile(
        path.join(tmpDir, "board.circuit.json"),
        JSON.stringify(ignoreErrors ? [traceError] : [warning]),
      )
      const { exitCode, stdout } = await runCommand(
        `tsci build --concurrency ${concurrency}${ignoreErrors ? " --ignore-errors" : ""}`,
      )
      expect(exitCode).toBe(0)
      expect(stdout).toContain("1 passed")
      expect(stdout).not.toContain("Build completed with errors")
    }, 30_000)
  }
}
