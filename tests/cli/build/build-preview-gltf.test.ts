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

test("build with --preview-gltf generates GLTF file", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stderr } = await runCommand(
    `tsci build --preview-gltf ${circuitPath}`,
  )

  expect(stderr).not.toContain("Failed to generate GLTF")

  const gltfContent = await readFile(
    path.join(tmpDir, "dist", "preview.gltf"),
    "utf-8",
  )
  const gltf = JSON.parse(gltfContent)

  // Verify GLTF structure
  expect(gltf.asset).toBeDefined()
  expect(gltf.asset.version).toBe("2.0")
}, 60_000)

test("build with --preview-gltf uses preview entrypoint from config", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const mainCircuit = path.join(tmpDir, "main.circuit.tsx")
  const previewCircuit = path.join(tmpDir, "preview.board.tsx")

  await writeFile(mainCircuit, circuitCode)
  await writeFile(previewCircuit, circuitCode)
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ previewComponentPath: "./preview.board.tsx" }),
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stderr } = await runCommand(`tsci build --preview-gltf`)

  expect(stderr).not.toContain("Failed to generate GLTF")

  // Should use the preview component path, so output should be preview.gltf
  const gltfContent = await readFile(
    path.join(tmpDir, "dist", "preview.gltf"),
    "utf-8",
  )
  const gltf = JSON.parse(gltfContent)

  expect(gltf.asset).toBeDefined()
  expect(gltf.asset.version).toBe("2.0")
}, 60_000)
