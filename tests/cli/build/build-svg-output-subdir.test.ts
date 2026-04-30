import { test, expect } from "bun:test"
import { readFile, stat, writeFile } from "node:fs/promises"
import path from "path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { mkdir } from "node:fs/promises"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

// Test for issue #2550: SVGs should be placed alongside circuit.json in the
// component's subdirectory, not at the dist root
test("build --svgs places SVGs in component subdirectory alongside circuit.json", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create component directory
  const componentDir = path.join(tmpDir, "lib/components/MyComponent")
  await mkdir(componentDir, { recursive: true })
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  // Create file at lib/components/MyComponent.tsx
  await writeFile(path.join(componentDir, "MyComponent.tsx"), circuitCode)

  // Build the single component file
  const result = await runCommand(
    `tsci build ${path.join(componentDir, "MyComponent.tsx")} --svgs --glbs`,
  )

  console.log("Exit code:", result.exitCode)
  console.log("STDOUT:", result.stdout)

  // The expected output structure:
  // dist/
  //   lib/components/MyComponent/
  //     MyComponent/           <-- Note: this is due to getOutputDirName behavior
  //       circuit.json
  //       pcb.svg
  //       schematic.svg
  //       3d.glb

  // Actually for MyComponent.tsx inside MyComponent dir, getOutputDirName returns
  // lib/components/MyComponent/MyComponent, so we need to check that path
  const outputSubdir = path.join(
    tmpDir,
    "dist/lib/components/MyComponent/MyComponent",
  )

  const pcbSvgPath = path.join(outputSubdir, "pcb.svg")
  const schematicSvgPath = path.join(outputSubdir, "schematic.svg")
  const circuitJsonPath = path.join(outputSubdir, "circuit.json")

  // All outputs should be in the same subdirectory
  const pcbSvg = await readFile(pcbSvgPath, "utf-8")
  expect(pcbSvg).toContain("<svg")

  const schematicSvg = await readFile(schematicSvgPath, "utf-8")
  expect(schematicSvg).toContain("<svg")

  const circuitJson = await readFile(circuitJsonPath, "utf-8")
  expect(circuitJson).toContain("type")
}, 60_000)

// Test that when building a file NOT in a same-named directory,
// SVGs go to the correct subdirectory
test("build --svgs places SVGs alongside circuit.json for non-same-named dirs", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create component at lib/components/Resistor.tsx (dir name differs from file)
  const componentDir = path.join(tmpDir, "lib/components")
  await mkdir(componentDir, { recursive: true })
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(path.join(componentDir, "Resistor.tsx"), circuitCode)

  const result = await runCommand(
    `tsci build ${path.join(componentDir, "Resistor.tsx")} --svgs`,
  )

  console.log("Exit code:", result.exitCode)
  console.log("STDOUT:", result.stdout)

  // For lib/components/Resistor.tsx:
  // getOutputDirName returns lib/components/Resistor
  // So output should be at dist/lib/components/Resistor/
  const outputSubdir = path.join(tmpDir, "dist/lib/components/Resistor")

  const pcbSvgPath = path.join(outputSubdir, "pcb.svg")
  const schematicSvgPath = path.join(outputSubdir, "schematic.svg")

  const pcbSvg = await readFile(pcbSvgPath, "utf-8")
  expect(pcbSvg).toContain("<svg")

  const schematicSvg = await readFile(schematicSvgPath, "utf-8")
  expect(schematicSvg).toContain("<svg")
}, 60_000)
