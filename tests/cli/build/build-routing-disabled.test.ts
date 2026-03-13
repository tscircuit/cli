import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("build supports --routing-disabled flag", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const circuitPath = path.join(tmpDir, "routing-disabled.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stdout, exitCode } = await runCommand(
    `tsci build ${circuitPath} --routing-disabled`,
  )

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Build complete")
}, 30_000)
