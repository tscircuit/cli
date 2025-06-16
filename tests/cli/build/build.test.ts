import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("build command writes dist/circuit.json", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")
  const extraCircuitPath = path.join(tmpDir, "extra.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(extraCircuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stdout } = await runCommand(`tsci build ${circuitPath}`)

  const data = await readFile(
    path.join(tmpDir, "dist", "circuit.json"),
    "utf-8",
  )
  const json = JSON.parse(data)
  const component = json.find((c: any) => c.type === "source_component")
  expect(component.name).toBe("R1")

  const extraData = await readFile(
    path.join(tmpDir, "dist", "extra", "circuit.json"),
    "utf-8",
  )
  const extraJson = JSON.parse(extraData)
  const extraComponent = extraJson.find(
    (c: any) => c.type === "source_component",
  )
  expect(extraComponent.name).toBe("R1")
})
