import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { writeFile, readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { CircuitRunner } from "tscircuit"

const glbCircuitCode = `
import cadModelUrl from "./chip.glb"

export default () => (
  <board width="20mm" height="20mm">
    <chip
      name="H1"
      footprint="soic8"
      cadModel={<cadmodel modelUrl={cadModelUrl} />}
    />
  </board>
)
`

test("transpile copies static assets and preserves glb_model_url", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "glb-test.tsx")
  const glbPath = path.join(tmpDir, "chip.glb")

  const glbBytes = Buffer.from([0x67, 0x6c, 0x54, 0x46, 0x01, 0x00, 0x00, 0x00])

  await writeFile(circuitPath, glbCircuitCode)
  await writeFile(glbPath, glbBytes)
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      type: "module",
      dependencies: {
        react: "^19.1.0",
      },
    }),
  )

  await runCommand(`tsci install`)
  await runCommand(`tsci transpile ${circuitPath}`)

  const assetsDir = path.join(tmpDir, "dist", "assets")
  const assetFiles = await readdir(assetsDir)
  const copiedGlb = assetFiles.find((file) => file.endsWith(".glb"))
  expect(copiedGlb).toBeDefined()

  const copiedContent = await readFile(path.join(assetsDir, copiedGlb!))
  const originalContent = await readFile(glbPath)
  expect(copiedContent.equals(originalContent)).toBe(true)

  const moduleUrl = pathToFileURL(path.join(tmpDir, "dist", "index.js")).href
  const transpiledModule = await import(moduleUrl)
  const Component = transpiledModule.default
  expect(typeof Component).toBe("function")

  const runner = new CircuitRunner()
  try {
    await runner.executeComponent(Component)
    await runner.renderUntilSettled()
    const circuitJson = await runner.getCircuitJson()
    const cadComponent = circuitJson.find(
      (element: any) => element.type === "cad_component",
    )
    const expectedAssetPath = path.join(tmpDir, "dist", "assets", copiedGlb!)
    const cadComponentWithGlb = cadComponent as
      | { glb_model_url?: string; model_glb_url?: string }
      | undefined
    const glbUrl =
      cadComponentWithGlb?.glb_model_url ?? cadComponentWithGlb?.model_glb_url
    expect(glbUrl).toBe(expectedAssetPath)
  } finally {
    await runner.kill()
  }
}, 60_000)
