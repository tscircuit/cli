import { getCliTestFixture } from "../../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, mkdir, readFile } from "node:fs/promises"
import path from "node:path"

const mainEntrypointCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R_MAIN" schX={3} pcbX={3} />
  </board>
)`

const previewComponentCode = `
export default () => (
  <board width="20mm" height="20mm">
    <resistor resistance="2k" footprint="0805" name="R_PREVIEW" schX={5} pcbX={5} />
  </board>
)`

const packageJsonWithReact = JSON.stringify({
  type: "module",
  dependencies: {
    react: "^19.1.0",
  },
})

test("build --preview-images uses previewComponentPath from config", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create two circuit files - one for main and one for preview
  // Both are .circuit.tsx so both will be built
  await writeFile(path.join(tmpDir, "main.circuit.tsx"), mainEntrypointCode)

  await mkdir(path.join(tmpDir, "examples"), { recursive: true })
  await writeFile(
    path.join(tmpDir, "examples", "showcase.circuit.tsx"),
    previewComponentCode,
  )

  // Create config with previewComponentPath pointing to the showcase
  // The preview images should be generated from showcase, not main
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      previewComponentPath: "examples/showcase.circuit.tsx",
    }),
  )

  await writeFile(path.join(tmpDir, "package.json"), packageJsonWithReact)

  // Install dependencies
  await runCommand("tsci install")

  // Run build with preview images
  await runCommand("tsci build --preview-images")

  // Check that preview images were generated
  const schematicSvg = await readFile(
    path.join(tmpDir, "dist", "schematic.svg"),
    "utf-8",
  )
  const pcbSvg = await readFile(path.join(tmpDir, "dist", "pcb.svg"), "utf-8")

  // The preview should be valid SVGs
  expect(schematicSvg).toContain("<svg")
  expect(pcbSvg).toContain("<svg")

  // Verify both circuits were built
  const mainCircuitJson = await readFile(
    path.join(tmpDir, "dist", "main", "circuit.json"),
    "utf-8",
  )
  const mainJson = JSON.parse(mainCircuitJson)
  const mainComponent = mainJson.find((c: any) => c.type === "source_component")
  expect(mainComponent.name).toBe("R_MAIN")

  const showcaseCircuitJson = await readFile(
    path.join(tmpDir, "dist", "examples", "showcase", "circuit.json"),
    "utf-8",
  )
  const showcaseJson = JSON.parse(showcaseCircuitJson)
  const previewComponent = showcaseJson.find(
    (c: any) => c.type === "source_component",
  )
  expect(previewComponent.name).toBe("R_PREVIEW")
}, 120_000)
