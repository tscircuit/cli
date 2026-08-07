import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

// R3 sits outside the board outline, which produces a pcb_placement_error.
// Core skips autorouting for any subcircuit carrying one, so the unrelated
// R1 -> R2 trace is left unrouted unless the placement gate is lifted.
const circuitCode = `
export default () => (
  <board width="20mm" height="12mm">
    <resistor name="R1" resistance="1k" footprint="0402" pcbX={-5} pcbY={0} />
    <resistor name="R2" resistance="1k" footprint="0402" pcbX={5} pcbY={0} />
    <resistor name="R3" resistance="1k" footprint="0402" pcbX={40} pcbY={0} />
    <trace name="T1" from=".R1 > .pin2" to=".R2 > .pin1" />
  </board>
)`

const buildAndReadCircuitJson = async (
  runCommand: (command: string) => Promise<{ exitCode: number }>,
  tmpDir: string,
  command: string,
) => {
  const { exitCode } = await runCommand(command)
  const circuitJson = JSON.parse(
    await readFile(path.join(tmpDir, "dist", "board", "circuit.json"), "utf-8"),
  )
  return {
    exitCode,
    placementErrors: circuitJson.filter((e: any) =>
      e.type.startsWith("pcb_component_outside_board"),
    ),
    autoroutingErrors: circuitJson.filter(
      (e: any) => e.type === "pcb_autorouting_error",
    ),
    traces: circuitJson.filter((e: any) => e.type === "pcb_trace"),
  }
}

test("a placement error blocks autorouting by default", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "board.circuit.tsx"), circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { placementErrors, autoroutingErrors, traces } =
    await buildAndReadCircuitJson(
      runCommand,
      tmpDir,
      "tsci build board.circuit.tsx --disable-parts-engine",
    )

  expect(placementErrors.length).toBeGreaterThan(0)
  expect(autoroutingErrors[0]?.message).toContain("Autorouting was skipped")
  expect(traces).toHaveLength(0)
}, 60_000)

test("--ignore-placement-drc lifts the gate so the board still routes", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "board.circuit.tsx"), circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, autoroutingErrors, traces } = await buildAndReadCircuitJson(
    runCommand,
    tmpDir,
    "tsci build board.circuit.tsx --disable-parts-engine --ignore-placement-drc",
  )

  expect(exitCode).toBe(0)
  expect(autoroutingErrors).toHaveLength(0)
  expect(traces).toHaveLength(1)
}, 60_000)
