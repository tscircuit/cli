import { test, expect } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("build --pcb-svgs --show-courtyards includes courtyard elements", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")

  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --pcb-svgs --show-courtyards ${circuitPath}`)

  const svg = await readFile(
    path.join(tmpDir, "dist", "preview", "pcb.svg"),
    "utf-8",
  )
  expect(svg).toContain("pcb-courtyard-")
}, 60_000)

test("build --pcb-svgs --show-courtyards overrides showCourtyards: false in config", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")

  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ pcbSnapshotSettings: { showCourtyards: false } }),
  )

  await runCommand(`tsci build --pcb-svgs --show-courtyards ${circuitPath}`)

  const svg = await readFile(
    path.join(tmpDir, "dist", "preview", "pcb.svg"),
    "utf-8",
  )
  expect(svg).toContain("pcb-courtyard-")
}, 60_000)
