import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

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

test("export readable-netlist", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stdout, stderr } = await runCommand(
    `tsci export ${circuitPath} -f readable-netlist`,
  )

  const { stdout: stdout1, stderr: stderr1 } = await runCommand(
    `tsci help; bun pm view circuit-json-to-readable-netlist; bun pm ls`,
  )
  console.log(stdout1, stderr1, 666999, 777888)

  // TODO: Remove this when the autorouter is not emitting this warning
  expect(stderr).toBe("")

  const readableNetlist = await readFile(
    path.join(tmpDir, "test-circuit-readable.netlist"),
    "utf-8",
  )
  expect(readableNetlist).toMatchSnapshot()
})
