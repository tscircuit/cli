import { expect, test } from "bun:test"
import path from "node:path"
import { writeFile } from "node:fs/promises"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const floatingPinCircuitCode = `
export default () => (
  <board width="10mm" height="10mm" routingDisabled>
    <chip
      name="U1"
      footprint="soic8"
      pinLabels={{ pin1: "EN", pin4: "GND", pin8: "VCC" }}
      pinAttributes={{
        EN: { mustBeConnected: true },
        VCC: { requiresPower: true },
        GND: { requiresGround: true },
      }}
      connections={{ VCC: "net.VCC", GND: "net.GND" }}
    />
  </board>
)
`

const cleanCircuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" schX={-3} pcbX={-3} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)
`

test("check netlist exits nonzero when netlist errors are reported", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "floating-pin.circuit.tsx")
  await writeFile(circuitPath, floatingPinCircuitCode)

  const { stdout, exitCode } = await runCommand(
    `tsci check netlist ${circuitPath}`,
  )

  expect(stdout).toContain("Errors: 1")
  expect(stdout).toContain("source_pin_must_be_connected_error")
  expect(exitCode).not.toBe(0)
}, 60_000)

test("check netlist exits zero when there are no netlist errors", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "clean-circuit.tsx")
  await writeFile(circuitPath, cleanCircuitCode)

  const { stdout, exitCode } = await runCommand(
    `tsci check netlist ${circuitPath}`,
  )

  expect(stdout).toContain("Errors: 0")
  expect(exitCode).toBe(0)
}, 60_000)

test("check exits nonzero when errors are reported", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "floating-pin.circuit.tsx")
  await writeFile(circuitPath, floatingPinCircuitCode)

  const { stdout, exitCode } = await runCommand(`tsci check ${circuitPath}`)

  expect(stdout).toContain("Errors: 1")
  expect(exitCode).not.toBe(0)
}, 60_000)

test("check exits zero when there are no errors", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "clean-circuit.tsx")
  await writeFile(circuitPath, cleanCircuitCode)

  const { stdout, exitCode } = await runCommand(`tsci check ${circuitPath}`)

  expect(stdout).toContain("Errors: 0")
  expect(exitCode).toBe(0)
}, 60_000)