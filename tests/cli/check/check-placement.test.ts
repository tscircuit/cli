import { expect, test } from "bun:test"
import path from "node:path"
import { writeFile, unlink } from "node:fs/promises"
import { checkPlacement } from "../../../cli/check/placement/register"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm" routingDisabled>
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={3} pcbY={2} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={-3} pcbY={-2} />
  </board>
)
`

const placementDrcCircuitCode = `
export default () => (
  <board width="10mm" height="10mm" routingDisabled>
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={5.2} pcbY={0} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={0} pcbY={0} />
  </board>
)
`

const makeCircuitFile = async (code = circuitCode) => {
  const circuitPath = path.join(
    process.cwd(),
    `tmp-check-placement-${Date.now()}-${Math.random().toString(36).slice(2)}.tsx`,
  )
  await writeFile(circuitPath, code)
  return circuitPath
}

test("check placement analyzes the provided refdes", async () => {
  const circuitPath = await makeCircuitFile()

  try {
    const output = await checkPlacement(circuitPath, "R1")
    expect(output).toContain("R1")
    expect(output).toContain("R1.center=(3mm, 2mm)")
    expect(output).toContain("R1.size=(width=")
  } finally {
    await unlink(circuitPath)
  }
}, 20_000)

test("check placement analyzes all placements when refdes is missing", async () => {
  const circuitPath = await makeCircuitFile()

  try {
    const output = await checkPlacement(circuitPath)
    expect(output).toContain("placement summary:")
    expect(output).toContain("no placement issues")
    expect(output).toContain("board-edge status:")
    expect(output).toContain("- R1:")
    expect(output).toContain("- C1:")
    expect(output).toContain("placement drc:")
    expect(output).toContain("Errors: 0")
    expect(output).toContain("Warnings: 0")
  } finally {
    await unlink(circuitPath)
  }
}, 20_000)

test("check placement includes placement DRC diagnostics from generated circuit json", async () => {
  const circuitPath = await makeCircuitFile(placementDrcCircuitCode)

  try {
    const output = await checkPlacement(circuitPath)
    expect(output).toContain("placement summary: 1 off-board")
    expect(output).toContain("placement drc:")
    expect(output).toContain("Errors: 1")
    expect(output).toContain("Warnings: 0")
    expect(output).toContain("pcb_component_outside_board_error")
    expect(output).toContain("Component R1 extends outside board boundaries")
    expect(output).not.toContain("source_pin_missing_trace_warning")

    const matches =
      output.match(/pcb_component_outside_board_error/g)?.length ?? 0
    expect(matches).toBe(1)
  } finally {
    await unlink(circuitPath)
  }
}, 20_000)

test("check placement scopes placement DRC diagnostics to the requested refdes", async () => {
  const circuitPath = await makeCircuitFile(placementDrcCircuitCode)

  try {
    const output = await checkPlacement(circuitPath, "C1")
    expect(output).toContain("C1")
    expect(output).toContain("placement drc:")
    expect(output).toContain("Errors: 0")
    expect(output).toContain("Warnings: 0")
    expect(output).not.toContain(
      "Component R1 extends outside board boundaries",
    )
    expect(output).not.toContain("pcb_component_outside_board_error")
  } finally {
    await unlink(circuitPath)
  }
}, 20_000)
