import { test, expect } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("build --pcb-svgs includes courtyards when pcbSnapshotSettings.showCourtyards is true", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(
    circuitPath,
    `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`,
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ pcbSnapshotSettings: { showCourtyards: true } }),
  )

  await runCommand(`tsci build --pcb-svgs ${circuitPath}`)

  const svg = await readFile(
    path.join(tmpDir, "dist", "preview", "pcb.svg"),
    "utf-8",
  )
  expect(svg).toContain("pcb-courtyard-")
}, 30_000)
