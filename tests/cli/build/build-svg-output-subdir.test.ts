import { test, expect } from "bun:test"
import { readFile, stat, writeFile, readdir } from "node:fs/promises"
import path from "path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("build --svgs places SVGs in component subdirectory alongside circuit.json", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  
  // Create component in subdirectory
  const componentDir = path.join(tmpDir, "lib/components/MyComponent")
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  
  // Ensure directory exists before writing file
  await writeFile(path.join(componentDir, "MyComponent.tsx"), circuitCode)

  const result = await runCommand(
    `tsci build ${path.join(componentDir, "MyComponent.tsx")} --svgs`,
  )

  console.log("Exit code:", result.exitCode)
  console.log("STDOUT:", result.stdout)

  // Circuit.json should be in subdirectory
  const circuitJsonPath = path.join(tmpDir, "dist/lib/components/MyComponent/circuit.json")
  
  // SVG should ALSO be in subdirectory alongside circuit.json
  const expectedPcbSvgPath = path.join(tmpDir, "dist/lib/components/MyComponent/pcb.svg")
  const expectedSchematicSvgPath = path.join(tmpDir, "dist/lib/components/MyComponent/schematic.svg")
  
  // Check SVG is in subdirectory
  const pcbSvg = await readFile(expectedPcbSvgPath, "utf-8")
  expect(pcbSvg).toContain("<svg")

  const schematicSvg = await readFile(expectedSchematicSvgPath, "utf-8")
  expect(schematicSvg).toContain("<svg")
  
  // Verify circuit.json exists in same directory
  const circuitJson = await readFile(circuitJsonPath, "utf-8")
  expect(circuitJson).toContain("type")
}, 60_000)
