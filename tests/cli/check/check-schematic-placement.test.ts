import { expect, test } from "bun:test"
import { rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { checkSchematicPlacement } from "../../../cli/check/schematic-placement/register"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="20mm" height="10mm">
    <resistor resistance="1k" name="R1" schX={0} schY={0} />
    <capacitor capacitance="1000pF" name="C1" schX={0.2} schY={0} />
    <trace from=".R1 > .pin2" to=".C1 > .pin1" />
  </board>
)
`

test("tsci check schematic-placement prints schematic placement analysis", async () => {
  const { runCommand } = await getCliTestFixture()
  const circuitPath = path.join(
    process.cwd(),
    `tmp-check-schematic-placement-${Date.now()}-${Math.random().toString(36).slice(2)}.tsx`,
  )

  try {
    await writeFile(circuitPath, circuitCode)

    const expected = await checkSchematicPlacement(circuitPath)

    const { stdout, stderr, exitCode } = await runCommand(
      `tsci check schematic-placement ${circuitPath}`,
    )

    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    expect(stdout.trim()).toBe(expected)
    expect(stdout).toContain("<SchematicBoxPositions>")
    expect(stdout).toContain('componentName="R1"')
    expect(stdout).toContain('componentName="C1"')
  } finally {
    await rm(circuitPath, { force: true })
  }
}, 20_000)
