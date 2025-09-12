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

test("export glb", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stdout, stderr } = await runCommand(
    `tsci export ${circuitPath} -f glb`,
  )

  // Check that the GLB file was created and has content
  const glbBuffer = await readFile(path.join(tmpDir, "test-circuit.glb"))

  // GLB files should be binary and have some content
  expect(glbBuffer.length).toBeGreaterThan(0)

  // GLB files start with "glTF" magic number
  const magicNumber = glbBuffer.subarray(0, 4).toString()
  expect(magicNumber).toBe("glTF")
}, 15000)

test("export gltf", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stdout, stderr } = await runCommand(
    `tsci export ${circuitPath} -f gltf`,
  )

  // Check that the GLTF file was created and is valid JSON
  const gltfContent = await readFile(
    path.join(tmpDir, "test-circuit.gltf"),
    "utf-8",
  )

  const gltfJson = JSON.parse(gltfContent)
  expect(gltfJson).toHaveProperty("asset")
  expect(gltfJson).toHaveProperty("scenes")
}, 15000)
