import { expect, test } from "bun:test"
import { rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { checkSchematicPlacement } from "../../../cli/check/schematic-placement/register"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="20mm" height="10mm">
    <schematicsheet name="power" displayName="Power" sheetIndex={1} />
    <schematicsheet name="control" displayName="Control" sheetIndex={2} />
    <resistor
      resistance="1k"
      name="R1"
      schX={0}
      schY={0}
      schSheetName="power"
    />
    <capacitor
      capacitance="1uF"
      name="C1"
      schX={0}
      schY={0}
      schOrientation="vertical"
      schSheetName="control"
    />
  </board>
)
`

test("schematic placement ignores overlaps across sheets", async () => {
  const { runCommand } = await getCliTestFixture()
  const circuitPath = path.join(
    process.cwd(),
    `tmp-check-schematic-placement-sheets-${Date.now()}-${Math.random().toString(36).slice(2)}.tsx`,
  )

  try {
    await writeFile(circuitPath, circuitCode)

    const analysis = await checkSchematicPlacement(circuitPath)
    const { stdout, stderr, exitCode } = await runCommand(
      `tsci check schematic-placement ${circuitPath}`,
    )

    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    expect(analysis).not.toContain("<SchematicPlacementIssues>")
    expect(stdout).not.toContain("<SchematicPlacementIssues>")
    expect(stdout).toContain('componentName="R1"')
    expect(stdout).toContain('componentName="C1"')
  } finally {
    await rm(circuitPath, { force: true })
  }
}, 20_000)
