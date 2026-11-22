import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
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

test("check exits nonzero when netlist errors are reported", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "floating-pin.circuit.tsx")
  await writeFile(circuitPath, floatingPinCircuitCode)

  const { stdout, exitCode } = await runCommand(
    `tsci check ${circuitPath}`,
  )

  expect(stdout).toContain("Errors: 1")
  expect(stdout).toContain("source_pin_must_be_connected_error")
  expect(exitCode).not.toBe(0)
}, 40_000)

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
}, 40_000)

test("check exits zero for a clean circuit", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "clean.circuit.json")
  await writeFile(
    circuitPath,
    JSON.stringify([
      {
        type: "source_component",
        source_component_id: "source_r1",
        name: "R1",
        ftype: "simple_resistor",
      },
    ]),
  )

  const { stdout, exitCode } = await runCommand(
    `tsci check ${circuitPath}`,
  )

  expect(stdout).toContain("Errors: 0")
  expect(exitCode).toBe(0)
}, 40_000)