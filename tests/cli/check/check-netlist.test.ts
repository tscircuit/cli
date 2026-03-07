import { expect, test } from "bun:test"
import path from "node:path"
import { writeFile } from "node:fs/promises"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor
      resistance="1k"
      footprint="0402"
      name="R1"
      schX={3}
      pcbX={3}
    />
    <capacitor
      capacitance="1000pF"
      footprint="0402"
      name="C1"
      schX={-3}
      pcbX={-3}
    />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)
`

test("check netlist includes readable netlist output", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check netlist ${circuitPath}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("Errors: 0")
  expect(stdout).toMatch(/Warnings: \d+/)
  expect(stdout).toContain("Readable Netlist:")
  expect(stdout).toContain("COMPONENTS:")
  expect(stdout).toContain("R1")
  expect(stdout).toContain("C1")
  expect(stdout).toContain("NET: C1_pos")
}, 20_000)
