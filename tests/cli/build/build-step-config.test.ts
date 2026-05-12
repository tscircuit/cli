import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
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
