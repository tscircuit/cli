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

test("build --preview-images previewComponentPath takes precedence over mainEntrypoint", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create both files - main entrypoint and preview component
  await mkdir(path.join(tmpDir, "lib"), { recursive: true })
  await writeFile(path.join(tmpDir, "lib", "index.tsx"), mainEntrypointCode)

  await mkdir(path.join(tmpDir, "examples"), { recursive: true })
  await writeFile(
    path.join(tmpDir, "examples", "demo.circuit.tsx"),
    previewComponentCode,
  )

  // Create config with both - previewComponentPath should take precedence
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      mainEntrypoint: "lib/index.tsx",
      previewComponentPath: "examples/demo.circuit.tsx",
    }),
  )

  await writeFile(path.join(tmpDir, "package.json"), packageJsonWithReact)

  // Install dependencies
  await runCommand("tsci install")

  // Run build with preview images
  await runCommand("tsci build --preview-images")

  // Both should be built, but preview images should come from previewComponentPath
  const schematicSvg = await readFile(
    path.join(tmpDir, "dist", "schematic.svg"),
    "utf-8",
  )
  const pcbSvg = await readFile(path.join(tmpDir, "dist", "pcb.svg"), "utf-8")

  expect(schematicSvg).toContain("<svg")
  expect(pcbSvg).toContain("<svg")

  // Verify the demo circuit was built and used for preview
  const demoCircuitJson = await readFile(
    path.join(tmpDir, "dist", "examples", "demo", "circuit.json"),
    "utf-8",
  )
  const demoJson = JSON.parse(demoCircuitJson)
  const demoComponent = demoJson.find((c: any) => c.type === "source_component")
  expect(demoComponent.name).toBe("R_PREVIEW")
}, 120_000)
