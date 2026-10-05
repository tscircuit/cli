import { expect, test } from "bun:test"
import path from "node:path"
import { writeFile } from "node:fs/promises"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

async function getNetlistTestFixture() {
  const fixture = await getCliTestFixture()
  // Keep project discovery and build-cache hashing inside this fixture.
  await writeFile(
    path.join(fixture.tmpDir, "package.json"),
    JSON.stringify({ name: "netlist-test", private: true }),
  )
  return fixture
}

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

test("check netlist includes readable netlist output", async () => {
  const { tmpDir, runCommand } = await getNetlistTestFixture()
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
  const { tmpDir, runCommand } = await getNetlistTestFixture()
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

const ledCircuitCode = (selector: string) => `
export default () => (
  <board width="20mm" height="15mm">
    <led name="LED1" footprint="0805" pcbX={-4} schX={-3} />
    <resistor name="R1" resistance="1k" footprint="0805" pcbX={4} schX={3} />
    <trace name="LED_ANODE" from="R1.pin1" to="LED1.anode" />
    <trace name="RETURN" from="R1.pin2" to="net.GND" />
    <trace name="LED_CATHODE" from="${selector}" to="net.GND" />
  </board>
)
`

for (const selector of ["LED1.cat", "MISSING_LED.cathode"]) {
  test(`check netlist fails for unresolved selector ${selector}`, async () => {
    const { tmpDir, runCommand } = await getNetlistTestFixture()
    const circuitPath = path.join(tmpDir, "invalid-selector.tsx")
    await writeFile(circuitPath, ledCircuitCode(selector))

    // Check both a fresh evaluation and the artifact from an explicit build.
    for (let run = 0; run < 2; run++) {
      if (run === 1) {
        const build = await runCommand(
          `tsci build ${circuitPath} --routing-disabled --disable-parts-engine`,
        )
        expect(build.exitCode).toBe(1)
      }
      const { stdout, exitCode } = await runCommand(
        `tsci check netlist ${circuitPath}`,
      )

      expect(stdout).toContain("Errors: 1")
      expect(stdout).toContain("source_trace_not_connected_error")
      expect(stdout).toContain(selector)
      expect(stdout).toContain("Readable Netlist:")
      expect(stdout).toContain("COMPONENTS:")
      expect(exitCode).toBe(1)
    }
  }, 40_000)
}

test("check netlist succeeds after correcting an invalid selector", async () => {
  const { tmpDir, runCommand } = await getNetlistTestFixture()
  const circuitPath = path.join(tmpDir, "corrected-selector.tsx")
  await writeFile(circuitPath, ledCircuitCode("LED1.cat"))

  const invalid = await runCommand(`tsci check netlist ${circuitPath}`)
  expect(invalid.exitCode).toBe(1)

  await writeFile(circuitPath, ledCircuitCode("LED1.cathode"))
  const corrected = await runCommand(`tsci check netlist ${circuitPath}`)

  expect(corrected.exitCode).toBe(0)
  expect(corrected.stdout).toContain("Errors: 0")
  expect(corrected.stdout).not.toContain("source_trace_not_connected_error")
  expect(corrected.stdout).toContain("Readable Netlist:")
}, 40_000)
