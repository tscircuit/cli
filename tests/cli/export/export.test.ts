import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
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

test("export schematic-svg", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stdout, stderr } = await runCommand(
    `tsci export ${circuitPath} -f schematic-svg`,
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
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stdout, stderr } = await runCommand(
    `tsci export ${circuitPath} -f specctra-dsn`,
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
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stdout, stderr } = await runCommand(
    `tsci export ${circuitPath} -f readable-netlist`,
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

test("export circuit-json", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stdout, stderr } = await runCommand(
    `tsci export ${circuitPath} -f circuit-json`,
  )
  expect(stderr).toBe("")

  console.log(stdout, "stdout")

  const circuitJson = await readFile(
    path.join(tmpDir, "test-circuit.circuit.json"),
    "utf-8",
  )
  const source_component = JSON.parse(circuitJson).filter(
    (component: any) => component.type === "source_component",
  )

  expect(source_component.length).toBe(2)
  expect(source_component[0].name).toBe("R1")
  expect(source_component[1].name).toBe("C1")
})
