import { expect, test } from "bun:test"
import { unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { analyzeRouting } from "@tscircuit/circuit-json-routing-analysis"
import { getCircuitJsonForCheck } from "../../../cli/check/shared"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="20mm" height="10mm" routingDisabled>
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-4} pcbY={0} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={4} pcbY={0} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)
`

test("tsci check routing-difficulty prints only routing-analysis output", async () => {
  const { runCommand } = await getCliTestFixture()
  const circuitPath = path.join(
    process.cwd(),
    `tmp-check-routing-difficulty-${Date.now()}-${Math.random().toString(36).slice(2)}.tsx`,
  )

  try {
    await writeFile(circuitPath, circuitCode)

    const circuitJson = await getCircuitJsonForCheck({
      filePath: circuitPath,
      platformConfig: {
        pcbDisabled: false,
        routingDisabled: true,
      },
    })
    const expected = (await analyzeRouting(circuitJson)).getString().trim()

    const { stdout, stderr, exitCode } = await runCommand(
      `tsci check routing-difficulty ${circuitPath}`,
    )

    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    expect(stdout.trim()).toContain(expected)
  } finally {
    await unlink(circuitPath)
  }
}, 20_000)
