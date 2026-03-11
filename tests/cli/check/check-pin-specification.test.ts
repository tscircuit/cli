import { expect, test } from "bun:test"
import path from "node:path"
import { writeFile } from "node:fs/promises"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <chip
      name="U1"
      footprint="soic8"
      pinLabels={{ pin1: "A1", pin2: "A2", pin3: "A3" }}
    />
  </board>
)
`

test("check pin_specification reports pin-spec warnings from TSX input", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")
  await writeFile(circuitPath, circuitCode)

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check pin_specification ${circuitPath}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("Errors: 0")
  expect(stdout).toContain("Warnings: 3")
  expect(stdout).toContain("source_component_pins_underspecified_warning")
  expect(stdout).toContain("source_no_power_pin_defined_warning")
  expect(stdout).toContain("source_no_ground_pin_defined_warning")
}, 20_000)
