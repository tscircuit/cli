import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"

const circuitCode = (name: string) => `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="${name}" schX={3} pcbX={3} />
  </board>
)`

test("build with --profile logs per-circuit circuit.json generation time", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(path.join(tmpDir, "first.circuit.tsx"), circuitCode("R1"))
  await writeFile(path.join(tmpDir, "second.circuit.tsx"), circuitCode("R2"))
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stdout, exitCode } = await runCommand("tsci build --profile")

  expect(exitCode).toBe(0)
  expect(stdout).toContain("[profile] first.circuit.tsx:")
  expect(stdout).toContain("[profile] second.circuit.tsx:")
}, 30_000)
