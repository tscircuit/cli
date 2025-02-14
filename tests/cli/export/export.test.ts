import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import "bun-match-svg"

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
)`

async function setupTestCircuit(tmpDir: string) {
  await Bun.write(path.join(tmpDir, "test-circuit.tsx"), circuitCode)
}

test("export pcb-svg", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await setupTestCircuit(tmpDir)

  const { stdout, stderr } = await runCommand(
    `tsci export ${path.join(tmpDir, "test-circuit.tsx")} -f pcb-svg`,
  )
  expect(stderr).toBe("")

  const pcbSvg = await readFile(
    path.join(tmpDir, "test-circuit-pcb.svg"),
    "utf-8",
  )
  expect(pcbSvg).toMatchSvgSnapshot(import.meta.path, "pcb")
})

test("export schematic-svg", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await setupTestCircuit(tmpDir)

  const { stdout, stderr } = await runCommand(
    `tsci export ${path.join(tmpDir, "test-circuit.tsx")} -f schematic-svg`,
  )
  expect(stderr).toBe("")

  const schematicSvg = await readFile(
    path.join(tmpDir, "test-circuit-schematic.svg"),
    "utf-8",
  )
  expect(schematicSvg).toMatchSvgSnapshot(import.meta.path, "schematic")
})

test("export specctra-dsn", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await setupTestCircuit(tmpDir)

  const { stdout, stderr } = await runCommand(
    `tsci export ${path.join(tmpDir, "test-circuit.tsx")} -f specctra-dsn`,
  )
  expect(stderr).toBe("")

  const specctraDSN = await readFile(
    path.join(tmpDir, "test-circuit.dsn"),
    "utf-8",
  )
  expect(specctraDSN).toContain("(layer F.Cu")
  expect(specctraDSN).toContain("(layer B.Cu")
  expect(specctraDSN).toContain('(component "simple_resistor')
  expect(specctraDSN).toContain('(net "Net-(R1_source_component_0-Pad1)"')
})

test("export readable-netlist", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await setupTestCircuit(tmpDir)

  const { stdout, stderr } = await runCommand(
    `tsci export ${path.join(tmpDir, "test-circuit.tsx")} -f readable-netlist`,
  )
  expect(stderr).toBe("")

  const readableNetlist = await readFile(
    path.join(tmpDir, "test-circuit-readable.netlist"),
    "utf-8",
  )
  expect(readableNetlist).toMatchInlineSnapshot(`
    "COMPONENTS:
     - R1: 1kΩ 0402 resistor
     - C1: 1nF 0402 capacitor

    NET: C1_pos
      - R1 pin1
      - C1 pin1 (+)
    "
  `)
})
