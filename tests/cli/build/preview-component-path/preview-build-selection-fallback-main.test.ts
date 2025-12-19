import { getCliTestFixture } from "../../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

const mainEntrypointCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R_MAIN" schX={3} pcbX={3} />
  </board>
)`

const packageJsonWithReact = JSON.stringify({
  type: "module",
  dependencies: {
    react: "^19.1.0",
  },
})

test("build --preview-images falls back to mainEntrypoint when no previewComponentPath", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create the main entrypoint
  await writeFile(path.join(tmpDir, "index.tsx"), mainEntrypointCode)

  // Create config with only mainEntrypoint (no previewComponentPath)
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      mainEntrypoint: "index.tsx",
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

  expect(schematicSvg).toContain("<svg")
  expect(pcbSvg).toContain("<svg")

  // Verify the circuit.json from index was used
  const indexCircuitJson = await readFile(
    path.join(tmpDir, "dist", "index", "circuit.json"),
    "utf-8",
  )
  const indexJson = JSON.parse(indexCircuitJson)
  const mainComponent = indexJson.find(
    (c: any) => c.type === "source_component",
  )
  expect(mainComponent.name).toBe("R_MAIN")
}, 120_000)
