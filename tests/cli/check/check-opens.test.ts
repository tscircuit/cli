import { expect, test } from "bun:test"
import { symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { checkOpens } from "../../../cli/check/opens/register"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

// The circuit is evaluated from the temp dir, so it needs the workspace's
// node_modules to resolve react/tscircuit (same approach as check-shorts.test).
const linkWorkspaceNodeModules = async (tmpDir: string) => {
  await symlink(
    path.join(process.cwd(), "node_modules"),
    path.join(tmpDir, "node_modules"),
    "dir",
  )
}

// routingDisabled leaves the trace declared but unrouted — no copper joins the
// two pads. That is precisely the failure mode `check opens` exists to catch:
// the build succeeds, no short exists, and the board is dead.
const unroutedCircuitCode = `
export default () => (
  <board width="10mm" height="10mm" routingDisabled>
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-2} pcbY={0} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={2} pcbY={0} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)
`

const routedCircuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-2} pcbY={0} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={2} pcbY={0} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)
`

test("check opens detects a net that was never routed", async () => {
  const { tmpDir } = await getCliTestFixture()
  await linkWorkspaceNodeModules(tmpDir)
  const circuitPath = path.join(tmpDir, "unrouted.circuit.tsx")
  await writeFile(circuitPath, unroutedCircuitCode)

  const result = await checkOpens(circuitPath, { mode: "pcb", layer: "top" })

  expect(result.opens.length).toBeGreaterThan(0)
  expect(result.output).toContain("Detected")
})

test("check opens reports nothing for a fully routed board", async () => {
  const { tmpDir } = await getCliTestFixture()
  await linkWorkspaceNodeModules(tmpDir)
  const circuitPath = path.join(tmpDir, "routed.circuit.tsx")
  await writeFile(circuitPath, routedCircuitCode)

  const result = await checkOpens(circuitPath, { mode: "pcb", layer: "top" })

  expect(result.opens).toHaveLength(0)
  expect(result.output).toContain("No opens detected")
})
