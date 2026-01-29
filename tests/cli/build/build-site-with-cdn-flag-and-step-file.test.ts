import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, readdir } from "node:fs/promises"
import path from "node:path"

const circuitCodeWithStepModel = `
import stepUrl from "./model.step"

export default () => (
  <board width="10mm" height="10mm">
    <resistor
      resistance="1k"
      footprint="0402"
      name="R1"
      cadModel={<cadmodel modelUrl={stepUrl} />}
    />
  </board>
)`

test("build with --site --use-cdn-javascript rewrites model_step_url to relative path", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test.circuit.tsx")
  const stepPath = path.join(tmpDir, "model.step")

  // Create a dummy STEP file
  await writeFile(stepPath, "dummy step file content for testing")
  await writeFile(circuitPath, circuitCodeWithStepModel)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stderr } = await runCommand(
    `tsci build --site --use-cdn-javascript ${circuitPath}`,
  )
  expect(stderr).toBe("")

  // Read the circuit.json and verify model_step_url is relative
  const circuitJson = JSON.parse(
    await readFile(path.join(tmpDir, "dist", "test", "circuit.json"), "utf-8"),
  )

  const cadComponent = circuitJson.find(
    (el: { type: string }) => el.type === "cad_component",
  )
  expect(cadComponent).toBeDefined()
  expect(cadComponent.model_step_url).toMatch(
    /^\.\/assets\/model-[a-f0-9]+\.step$/,
  )

  // Verify the asset was copied to dist/assets
  const assetsDir = path.join(tmpDir, "dist", "assets")
  const assetFiles = await readdir(assetsDir)
  const stepFile = assetFiles.find((f) => f.endsWith(".step"))
  expect(stepFile).toBeDefined()
}, 30_000)
