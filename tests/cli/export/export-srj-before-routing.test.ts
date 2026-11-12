import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("TSX SRJ export preserves input connections before routing", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const file = path.join(tmpDir, "widths.circuit.tsx")
  await writeFile(
    file,
    `
    export default () => <board width={20} height={16} schematicDisabled
      autorouter="auto_local" minTraceWidth={0.1} defaultTraceWidth={0.35}>
      <resistor name="R1" resistance={100} footprint="1206" pcbX={-5} pcbY={3}/>
      <resistor name="R2" resistance={100} footprint="1206" pcbX={5} pcbY={3}/>
      <resistor name="R3" resistance={100} footprint="1206" pcbX={-5} pcbY={-3}/>
      <resistor name="R4" resistance={100} footprint="1206" pcbX={5} pcbY={-3}/>
      <trace from=".R1 > .pin2" to=".R2 > .pin1"/>
      <trace from=".R3 > .pin2" to=".R4 > .pin1" thickness={0.55}/>
    </board>`,
  )
  const result = await runCommand(`tsci export ${file} -f srj -o input.json`)
  expect(result.exitCode).toBe(0)
  const srj = JSON.parse(
    await readFile(path.join(tmpDir, "input.json"), "utf8"),
  )
  expect(result.stdout).toContain("Saved autorouting paths")
  expect(srj.connections).toHaveLength(0)
  expect(srj.minTraceWidth).toBe(0.1)
}, 60_000)
