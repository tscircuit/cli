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
