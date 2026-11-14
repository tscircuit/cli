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

const placementDrcCircuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={5.2} pcbY={0} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={0} pcbY={0} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)
`

// https://github.com/tscircuit/cli/issues/5447
const resistorLedCircuitCode = `
export default () => (
  <board width="20mm" height="12mm" layers={2}>
    <pinheader name="J1" pinCount={2} pitch="2.54mm" pcbX={-6} pcbY={0} />
    <resistor name="R1" resistance="1k" footprint="0603" pcbX={1} pcbY={2} />
    <led name="D1" color="green" footprint="0603" pcbX={6} pcbY={0} />
    <trace name="VIN" from=".J1 > .pin1" to=".R1 > .pin1" />
    <trace name="LED_A" from=".R1 > .pin2" to=".D1 > .anode" />
    <trace name="GND" from=".D1 > .cathode" to=".J1 > .pin2" />
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

test("check netlist filters out placement diagnostics", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "placement-drc-circuit.tsx")

  await writeFile(circuitPath, placementDrcCircuitCode)

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check netlist ${circuitPath}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("Errors: 0")
  expect(stdout).toContain("Warnings: 0")
  expect(stdout).toContain("Readable Netlist:")
  expect(stdout).not.toContain("placement")
  expect(stdout).not.toContain("pcb_component_outside_board_error")
  expect(stdout).not.toContain("Component R1 extends outside board boundaries")
}, 20_000)

test("check netlist omits missing footprints and resistor polarity aliases", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "resistor-led-circuit.tsx")

  await writeFile(circuitPath, resistorLedCircuitCode)

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check netlist ${circuitPath}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).not.toContain("undefined")
  // The LED is polarized, so only it keeps the anode/cathode aliases
  const componentPins = stdout.slice(stdout.indexOf("COMPONENT_PINS:")).trim()
  expect(componentPins).toMatchInlineSnapshot(`
    "COMPONENT_PINS:
    J1
    - pin1: NETS(R1_pos)
    - pin2: NETS(D1_neg)

    R1 (1kΩ)
    - pin1(pos, left): NETS(R1_pos)
    - pin2(neg, right): NETS(D1_pos)

    D1
    - pin1(anode, pos, left): NETS(D1_pos)
    - pin2(cathode, neg, right): NETS(D1_neg)"
  `)
}, 20_000)
