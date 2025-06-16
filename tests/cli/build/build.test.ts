import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, stat } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

// When a file is provided only that file should be built

test("build with file only outputs that file", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")
  const extraCircuitPath = path.join(tmpDir, "extra.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(extraCircuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build ${circuitPath}`)

  const data = await readFile(
    path.join(tmpDir, "dist", "circuit.json"),
    "utf-8",
  )
  const json = JSON.parse(data)
  const component = json.find((c: any) => c.type === "source_component")
  expect(component.name).toBe("R1")

  await expect(
    stat(path.join(tmpDir, "dist", "extra", "circuit.json")),
  ).rejects.toBeTruthy()
})

// When no file is provided search for *.circuit.tsx files

test("build without file builds circuit files", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const mainPath = path.join(tmpDir, "index.tsx")
  const circuitPath = path.join(tmpDir, "extra.circuit.tsx")
  await writeFile(mainPath, circuitCode)
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build`)

  const mainData = await readFile(
    path.join(tmpDir, "dist", "circuit.json"),
    "utf-8",
  )
  const mainJson = JSON.parse(mainData)
  const mainComponent = mainJson.find((c: any) => c.type === "source_component")
  expect(mainComponent.name).toBe("R1")

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
