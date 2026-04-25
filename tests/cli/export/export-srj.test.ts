import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
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
)`

test("export srj from circuit.json", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitTsxPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitTsxPath, circuitCode)

  const circuitJsonResult = await runCommand(
    `tsci export ${circuitTsxPath} -f circuit-json`,
  )
  expect(circuitJsonResult.stderr).toBe("")
  expect(circuitJsonResult.exitCode).toBe(0)

  const circuitJsonPath = path.join(tmpDir, "test-circuit.circuit.json")
  const srjResult = await runCommand(`tsci export -f srj ${circuitJsonPath}`)

  expect(srjResult.stderr).toBe("")
  expect(srjResult.exitCode).toBe(0)

  const srj = await readFile(
    path.join(tmpDir, "test-circuit.circuit.simple-route.json"),
    "utf-8",
  )
  const parsedSrj = JSON.parse(srj)

  expect(typeof parsedSrj).toBe("object")
  expect(parsedSrj).not.toBeNull()
  expect(parsedSrj).not.toHaveProperty("simpleRouteJson")
  expect(parsedSrj).toHaveProperty("layerCount")
  expect(parsedSrj).toHaveProperty("bounds")
  expect(Array.isArray(parsedSrj.obstacles)).toBe(true)
  expect(Array.isArray(parsedSrj.connections)).toBe(true)
})
