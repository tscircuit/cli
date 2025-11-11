import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
import { PICO } from "@tsci/seveibar.PICO"
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
    <PICO name="PICO" schX={3} pcbX={3} />
  </board>
)`

test("build with external package", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "index.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build ${circuitPath}`)

  const circuitJson = await readFile(
    path.join(tmpDir, "dist", "index", "circuit.json"),
    "utf-8",
  )
  const circuitJsonArray = JSON.parse(circuitJson)
  const components = circuitJsonArray.filter(
    (c: any) => c.type === "source_component",
  )
  expect(components.length).toBeGreaterThan(0)
  const picoComponent = components.find((c: any) => c.name === "PICO")
  expect(picoComponent).toBeDefined()
  expect(picoComponent.name).toBe("PICO")
}, 30_000)
