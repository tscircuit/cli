import { expect, test } from "bun:test"
import { rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { analyzeCircuitJsonTraceLength } from "circuit-json-trace-length-analysis"
import { getCircuitJsonForCheck } from "../../../cli/check/shared"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const directTraceCircuitCode = `
export default () => (
  <board width="20mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-4} pcbY={0} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={4} pcbY={0} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)
`

const namedNetCircuitCode = `
export default () => (
  <board width="20mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-4} pcbY={0} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={4} pcbY={0} />
    <trace from=".R1 > .pin1" to="net.RESET_N" />
    <trace from="net.RESET_N" to=".C1 > .pin1" />
  </board>
)
`

test("tsci check trace-length prints trace-length XML for a routed pin target", async () => {
  const { runCommand } = await getCliTestFixture()
  const circuitPath = path.join(
    process.cwd(),
    `tmp-check-trace-length-pin-${Date.now()}-${Math.random().toString(36).slice(2)}.tsx`,
  )

  try {
    await writeFile(circuitPath, directTraceCircuitCode)

    const circuitJson = await getCircuitJsonForCheck({
      filePath: circuitPath,
      platformConfig: {
        pcbDisabled: false,
        routingDisabled: false,
      },
    })
    const expected = analyzeCircuitJsonTraceLength(circuitJson, {
      targetPinOrNet: "R1.pin1",
    }).toString()

    const { stdout, stderr, exitCode } = await runCommand(
      `tsci check trace-length R1.pin1 ${circuitPath}`,
    )

    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    expect(stdout.trim()).toContain(expected)
  } finally {
    await rm(circuitPath, { force: true })
  }
}, 20_000)

test("tsci check trace-length accepts prebuilt circuit json and preserves inferred net logs", async () => {
  const { runCommand } = await getCliTestFixture()
  const fileStem = `tmp-check-trace-length-net-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const circuitSourcePath = path.join(process.cwd(), `${fileStem}.tsx`)
  const circuitJsonPath = path.join(process.cwd(), `${fileStem}.circuit.json`)

  try {
    await writeFile(circuitSourcePath, namedNetCircuitCode)

    const circuitJson = await getCircuitJsonForCheck({
      filePath: circuitSourcePath,
      platformConfig: {
        pcbDisabled: false,
        routingDisabled: false,
      },
    })
    await writeFile(circuitJsonPath, JSON.stringify(circuitJson, null, 2))

    const { stdout, stderr, exitCode } = await runCommand(
      `tsci check trace-length RESET_N ${circuitJsonPath}`,
    )

    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    expect(stdout).toContain("inferring net.RESET_N")
    expect(stdout).toContain(
      '<TraceLengthAnalysis requestedTarget="RESET_N" resolvedTarget="net.RESET_N" targetKind="net"',
    )
    expect(stdout).toContain('traceCount="2"')
  } finally {
    await rm(circuitSourcePath, { force: true })
    await rm(circuitJsonPath, { force: true })
  }
}, 20_000)
