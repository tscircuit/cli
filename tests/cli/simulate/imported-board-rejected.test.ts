import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"

// A board tagged the way @tscircuit/pcb-spice-pipeline's internal ImportedBoard
// tags itself. tsci must reject it rather than emit the rebuilt preview.
const circuitCode = `export default () => (
  <board
    ref={(board: any) => {
      if (board) board[Symbol.for("pcb-spice-pipeline.imported-board.v2")] = []
    }}
    width={10}
    height={10}
  >
    <resistor name="R1" resistance="1k" footprint="0402" />
  </board>
)`

test(
  "simulate rejects the pipeline-internal ImportedBoard with a clear message",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const circuitPath = path.join(tmpDir, "imported-board.tsx")
    await writeFile(circuitPath, circuitCode)

    const { stdout, stderr, exitCode } = await runCommand(
      `tsci simulate ${circuitPath}`,
    )

    expect(exitCode).not.toBe(0)
    const output = stdout + stderr
    expect(output).toContain(
      "ImportedBoard is internal to @tscircuit/pcb-spice-pipeline",
    )
    expect(output).not.toContain("Cannot find module")
  },
  { timeout: 60000 },
)
