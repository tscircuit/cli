import { expect, test } from "bun:test"
import { stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const validCircuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" />
  </board>
)
`

const failingCircuitCode = `
export default () => {
  throw new Error("intentional failed rebuild")
}
`

test("failed rebuild removes the previous circuit JSON", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "index.tsx")
  const outputPath = path.join(tmpDir, "dist", "index", "circuit.json")
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(circuitPath, validCircuitCode)

  const firstBuild = await runCommand("tsci build index.tsx")
  expect(firstBuild.exitCode).toBe(0)
  expect((await stat(outputPath)).isFile()).toBe(true)

  await writeFile(circuitPath, failingCircuitCode)
  const failedRebuild = await runCommand("tsci build index.tsx")

  expect(failedRebuild.exitCode).toBe(1)
  expect(failedRebuild.stderr).toContain("intentional failed rebuild")
  await expect(stat(outputPath)).rejects.toMatchObject({ code: "ENOENT" })
}, 30_000)
