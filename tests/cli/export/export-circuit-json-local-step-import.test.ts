import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCodeWithLocalStepImport = `
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

test("export circuit-json supports local step imports", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "local-step.tsx")
  const stepPath = path.join(tmpDir, "chip.step")
  const stepContent =
    "ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n"

  await writeFile(circuitPath, circuitCodeWithLocalStepImport)
  await writeFile(stepPath, stepContent)
  await writeFile(path.join(tmpDir, "package.json"), JSON.stringify({}))

  const { stderr } = await runCommand(
    `tsci export ${circuitPath} -f circuit-json`,
  )
  expect(stderr).toBe("")

  const circuitJson = JSON.parse(
    await readFile(path.join(tmpDir, "local-step.circuit.json"), "utf-8"),
  )
  const cadComponent = circuitJson.find(
    (component: any) => component.type === "cad_component",
  ) as { model_step_url?: string; step_model_url?: string } | undefined

  const stepUrl = cadComponent?.model_step_url ?? cadComponent?.step_model_url
  expect(stepUrl).toBe("./chip.step")
}, 60_000)
