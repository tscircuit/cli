import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="20mm" height="12mm">
    <resistor name="R1" resistance="1k" footprint="0402" pcbX={-5} pcbY={0} />
    <resistor name="R2" resistance="1k" footprint="0402" pcbX={5} pcbY={0} />
    <trace name="T1" from=".R1 > .pin2" to=".R2 > .pin1" />
  </board>
)`

const setupCircuit = async (tmpDir: string) => {
  await writeFile(path.join(tmpDir, "board.circuit.tsx"), circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")
}

test("build succeeds when every PCB net is routed", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await setupCircuit(tmpDir)

  const { exitCode, stdout, stderr } = await runCommand(
    "tsci build board.circuit.tsx --disable-parts-engine",
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("Routing   0 unrouted")
}, 60_000)

test("build fails on unrouted PCB nets even with --ignore-errors", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await setupCircuit(tmpDir)

  const { exitCode, stdout, stderr } = await runCommand(
    "tsci build board.circuit.tsx --disable-parts-engine --routing-disabled --ignore-errors",
  )

  expect(exitCode).toBe(1)
  expect(stdout).toContain("Routing   1 unrouted")
  expect(stdout).toContain("Build completed with errors")
  expect(stderr).toContain("Unrouted PCB net")
  expect(stderr).toContain(".R1 > .pin2 to .R2 > .pin1")
}, 60_000)
