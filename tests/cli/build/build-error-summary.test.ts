import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitJson = [
  {
    type: "source_trace_not_connected_error",
    error_type: "source_trace_not_connected_error",
    message: 'Could not find port for selector ".USBC > .SHELL3"',
  },
  {
    type: "pcb_autorouting_error",
    error_type: "pcb_autorouting_error",
    message: "Remaining routes left unrouted",
  },
  ...Array.from({ length: 25 }, (_, i) => ({
    type: "pcb_port_not_connected_error",
    error_type: "pcb_port_not_connected_error",
    message: `Port [U1.pin${i + 1}] is not connected to net [N${i + 1}] by a PCB trace.`,
  })),
]

test("build collapses repeated errors and prints a count per error type", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(
    path.join(tmpDir, "board.circuit.json"),
    JSON.stringify(circuitJson),
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stderr } = await runCommand("tsci build board.circuit.json")

  expect(exitCode).toBe(1)
  const errorLines = stderr
    .split("\n")
    .filter((line) => !line.startsWith("Build exiting"))
    .join("\n")
    .trim()
  expect(errorLines).toMatchInlineSnapshot(`
    "Could not find port for selector ".USBC > .SHELL3"
    Remaining routes left unrouted
    Port [U1.pin1] is not connected to net [N1] by a PCB trace.
    Port [U1.pin2] is not connected to net [N2] by a PCB trace.
    Port [U1.pin3] is not connected to net [N3] by a PCB trace.
    Port [U1.pin4] is not connected to net [N4] by a PCB trace.
    Port [U1.pin5] is not connected to net [N5] by a PCB trace.
    Port [U1.pin6] is not connected to net [N6] by a PCB trace.
    Port [U1.pin7] is not connected to net [N7] by a PCB trace.
    Port [U1.pin8] is not connected to net [N8] by a PCB trace.
    Port [U1.pin9] is not connected to net [N9] by a PCB trace.
    Port [U1.pin10] is not connected to net [N10] by a PCB trace.
    … 15 more pcb_port_not_connected_error not shown
    27 error(s) in dist/board/circuit.json:
      25  pcb_port_not_connected_error
       1  pcb_autorouting_error
       1  source_trace_not_connected_error"
  `)
}, 30_000)
