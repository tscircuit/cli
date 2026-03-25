import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor
      resistance="1k"
      footprint="0402"
      name="R1"
      schX={3}
      pcbX={3}
    />
    <capacitor
      capacitance="1000pF"
      footprint="0402"
      name="C1"
      schX={-3}
      pcbX={-3}
    />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)
`

test(
  "export step",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const circuitPath = path.join(tmpDir, "test-circuit.tsx")

    await writeFile(circuitPath, circuitCode)

    const { stdout, stderr } = await runCommand(
      `tsci export ${circuitPath} -f step`,
    )

    expect(stderr).toBe("")

    const stepContent = await readFile(
      path.join(tmpDir, "test-circuit.step"),
      "utf-8",
    )

    // STEP files start with an ISO-10303-21 header
    expect(stepContent).toContain("ISO-10303-21")
    expect(stepContent).toContain("FILE_DESCRIPTION")
    expect(stepContent).toContain("FILE_NAME")
  },
  { timeout: 30000 },
)
