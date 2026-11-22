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

const cleanCircuitCode = `
export default () => (
  <board width="10mm" height="10mm" routingDisabled>
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-2} pcbY={0} />
    <resistor resistance="1k" footprint="0402" name="R2" pcbX={2} pcbY={0} />
    <trace from=".R1 > .pin1" to=".R2 > .pin1" />
  </board>
)
`

const writeCircuit = async (tmpDir: string, fileName: string, code: string) => {
  const circuitPath = path.join(tmpDir, fileName)
  await writeFile(circuitPath, code)
  return circuitPath
}

test("check netlist exits nonzero when netlist errors are reported", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = await writeCircuit(
    tmpDir,
    "floating-pin-netlist.tsx",
    floatingPinCircuitCode,
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check netlist ${circuitPath}`,
  )

  expect(exitCode).toBe(1)
  expect(stderr).toBe("")
  expect(stdout).toContain("Errors: 1")
  expect(stdout).toContain("source_pin_must_be_connected_error")
})

test("check netlist exits zero for a clean netlist", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = await writeCircuit(
    tmpDir,
    "clean-netlist.tsx",
    cleanCircuitCode,
  )

  const { stdout, exitCode } = await runCommand(
    `tsci check netlist ${circuitPath}`,
  )

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Errors: 0")
})

test("check exits nonzero when errors are reported", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = await writeCircuit(
    tmpDir,
    "floating-pin-check.tsx",
    floatingPinCircuitCode,
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check ${circuitPath}`,
  )

  expect(exitCode).toBe(1)
  expect(stderr).toBe("")
  expect(stdout).toContain("Errors: 1")
  expect(stdout).toContain("source_pin_must_be_connected_error")
})

test("check exits zero for a clean circuit", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = await writeCircuit(
    tmpDir,
    "clean-check.tsx",
    cleanCircuitCode,
  )

  const { stdout, exitCode } = await runCommand(`tsci check ${circuitPath}`)

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Errors: 0")
})