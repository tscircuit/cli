import { expect, test } from "bun:test"
import path from "node:path"
import { writeFile, unlink } from "node:fs/promises"
import { checkRouting } from "../../../cli/check/routing/register"

const routedCircuitCode = `
export default () => (
  <board width="20mm" height="20mm">
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-3} pcbY={0} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={3} pcbY={0} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)
`

const circuitJsonWithRoutingErrors = JSON.stringify([
  {
    type: "source_group",
    source_group_id: "source_group_1",
    name: "__root__",
  },
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_1",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    thickness: 1.4,
    num_layers: 2,
  },
  {
    type: "pcb_port_not_connected_error",
    error_type: "pcb_port_not_connected_error",
    pcb_port_not_connected_error_id: "err_1",
    message: "Port R1 > pin1 is not connected to any trace",
    pcb_port_id: "pcb_port_1",
  },
])

const makeCircuitFile = async (content: string, ext = ".tsx") => {
  const circuitPath = path.join(
    process.cwd(),
    `tmp-check-routing-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`,
  )
  await writeFile(circuitPath, content)
  return circuitPath
}

test("check routing reports no errors for a routed circuit", async () => {
  const circuitPath = await makeCircuitFile(routedCircuitCode)

  try {
    const { output, hasErrors } = await checkRouting(circuitPath)
    expect(output).toContain("routing drc:")
    expect(output).toContain("Errors: 0")
    expect(hasErrors).toBe(false)
  } finally {
    await unlink(circuitPath)
  }
}, 30_000)

test("check routing reports errors for a circuit json with routing errors", async () => {
  const circuitPath = await makeCircuitFile(circuitJsonWithRoutingErrors, ".circuit.json")

  try {
    const { output, hasErrors } = await checkRouting(circuitPath)
    expect(output).toContain("routing drc:")
    expect(output).toContain("Errors: 1")
    expect(output).toContain("pcb_port_not_connected_error")
    expect(hasErrors).toBe(true)
  } finally {
    await unlink(circuitPath)
  }
}, 30_000)
