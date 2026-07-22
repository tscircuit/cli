import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board routingDisabled>
    <schematicsheet name="input" displayName="1. Input" sheetIndex={1}>
      <resistor name="R1" resistance="1k" footprint="0402" schX={0} />
    </schematicsheet>
    <schematicsheet name="output" displayName="2. Output" sheetIndex={2}>
      <resistor name="R2" resistance="2k" footprint="0402" schX={0} />
    </schematicsheet>
  </board>
)`

test("export schematic-pdf creates one PDF page per schematic sheet", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const result = await runCommand(`tsci export ${circuitPath} -f schematic-pdf`)

  expect(result.stderr).toBe("")
  expect(result.exitCode).toBe(0)

  const pdf = await readFile(path.join(tmpDir, "test-circuit-schematic.pdf"))

  expect(pdf.subarray(0, 4).toString()).toBe("%PDF")
  expect(pdf.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(2)
}, 60_000)
