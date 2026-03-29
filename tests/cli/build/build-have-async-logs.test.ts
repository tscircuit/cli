import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" schX={3} pcbX={3} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)`
test("build logs async circuit effect status", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stdout } = await runCommand(`tsci build ${circuitPath}`)

  console.log(stdout)
  expect(stdout).toContain("waiting on capacity-mesh-autorouting")
}, 30_000)
