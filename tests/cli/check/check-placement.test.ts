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

const makeCircuitFile = async () => {
  const circuitPath = path.join(
    process.cwd(),
    `tmp-check-placement-${Date.now()}-${Math.random().toString(36).slice(2)}.tsx`,
  )
  await writeFile(circuitPath, circuitCode)
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
  } finally {
    await unlink(circuitPath)
  }
}, 20_000)
