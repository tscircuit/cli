import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("export pcb-svg --show-courtyards includes courtyard elements", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  await runCommand(`tsci export ${circuitPath} -f pcb-svg --show-courtyards`)

  const svg = await readFile(path.join(tmpDir, "test-circuit-pcb.svg"), "utf-8")
  expect(svg).toContain("pcb-courtyard-")
}, 60_000)
