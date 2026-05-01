import { expect, test } from "bun:test"
import { readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { CircuitRunner } from "tscircuit"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const stepCircuitCode = `
import cadModelUrl from "./chip.step"

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

test("transpile copies static assets and preserves step_model_url", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "step-test.tsx")
  const stepPath = path.join(tmpDir, "chip.step")
  const stepContent =
    "ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n"

  await writeFile(circuitPath, stepCircuitCode)
  await writeFile(stepPath, stepContent)
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      type: "module",
      dependencies: {
        react: "^19.1.0",
      },
    }),
  )

  await runCommand("tsci install")
  await runCommand(`tsci transpile ${circuitPath}`)

  const assetsDir = path.join(tmpDir, "dist", "assets")
  const assetFiles = await readdir(assetsDir)
  const copiedStep = assetFiles.find((file) => file.endsWith(".step"))
  expect(copiedStep).toBeDefined()

  const copiedContent = await readFile(
    path.join(assetsDir, copiedStep!),
    "utf-8",
  )
  expect(copiedContent).toBe(stepContent)

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
    const expectedAssetPath = path.join(tmpDir, "dist", "assets", copiedStep!)
    const cadComponentWithStep = cadComponent as
      | { step_model_url?: string; model_step_url?: string }
      | undefined
    const stepUrl =
      cadComponentWithStep?.step_model_url ??
      cadComponentWithStep?.model_step_url

    expect(stepUrl).toBe(expectedAssetPath)
  } finally {
    await runner.kill()
  }
}, 60_000)
