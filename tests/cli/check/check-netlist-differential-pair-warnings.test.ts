import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="20mm" height="14mm" routingDisabled>
    <differentialpair
      name="USB_DATA"
      positiveConnection="DP_FROM_J1"
      negativeConnection="DM"
    />
    <chip name="J1" footprint="soic8" />
    <chip name="U1" footprint="soic8" />
    <testpoint name="TP1" footprintVariant="pad" />
    <trace name="DP_FROM_J1" from=".J1 > .pin1" to="net.DP" />
    <trace from="net.DP" to=".U1 > .pin1" />
    <trace from="net.DP" to=".TP1 > .pin1" />
    <trace name="DM" from=".J1 > .pin2" to=".U1 > .pin2" />
  </board>
)
`

test("check netlist displays Core differential-pair warnings", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "differential-pair.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check netlist ${circuitPath}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("Errors: 0")
  expect(stdout).toContain("Warnings: 1")
  expect(stdout).toContain("- source_property_ignored_warning:")
}, 20_000)
