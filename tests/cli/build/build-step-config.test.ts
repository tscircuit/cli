import { expect, test } from "bun:test"
import { cp, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)
`

test("build uses config build.step setting", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "step-output.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      build: {
        step: true,
      },
    }),
  )

  const { stderr, stdout } = await runCommand(`tsci build ${circuitPath}`)
  expect(stderr).toBe("")
  expect(stdout).toContain("Generating STEP models")
  expect(stdout).toContain("step")

  const stepContent = await readFile(
    path.join(tmpDir, "dist", "step-output", "3d.step"),
    "utf-8",
  )

  expect(stepContent).toContain("ISO-10303-21")
  expect(stepContent).toContain("FILE_DESCRIPTION")
}, 60_000)

test("build --step includes external STEP cad models", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const assetsDir = path.join(tmpDir, "assets")
  const circuitPath = path.join(tmpDir, "external-step.circuit.tsx")

  await cp(path.join(import.meta.dir, "../assets"), assetsDir, {
    recursive: true,
  })
  await writeFile(
    circuitPath,
    `
import stepUrl from "./assets/SW_Push_1P1T_NO_CK_KMR2.step"

export default () => (
  <board width="20mm" height="20mm">
    <chip
      name="SW1"
      footprint="pushbutton"
      cadModel={<cadmodel modelUrl={stepUrl} />}
    />
  </board>
)
`,
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stderr, stdout } = await runCommand(
    `tsci build --step ${circuitPath}`,
  )
  expect(stderr).toBe("")
  expect(stdout).toContain("Written 3d.step")

  const stepContent = await readFile(
    path.join(tmpDir, "dist", "external-step", "3d.step"),
    "utf-8",
  )

  expect(stepContent).toContain("ISO-10303-21")
  expect(stepContent).toContain("MANIFOLD_SOLID_BREP('PCB'")
  expect(
    stepContent.match(/MANIFOLD_SOLID_BREP/g)?.length ?? 0,
  ).toBeGreaterThan(1)
}, 60_000)
