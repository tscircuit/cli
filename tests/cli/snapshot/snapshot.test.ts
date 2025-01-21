import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"

test.skip("snapshot command creates SVG snapshots", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create test files using Bun
  await Bun.write(join(tmpDir, "circuit.example.tsx"), `
    export const SimpleCircuit = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `)

  await Bun.write(join(tmpDir, "main.tsx"), `
    export const MainCircuit = () => (
      <board width="20mm" height="20mm">
        <resistor value="10k" />
      </board>
    )
  `)

  // Run snapshot update command
  const { stdout: updateStdout } = await runCommand("tsci snapshot --update")
  expect(updateStdout).toContain("Created snapshots")

  // Verify snapshots were created
  const snapshotDir = join(tmpDir, "__snapshots__")
  const circuitSnapshot = await Bun.file(join(snapshotDir, "circuit.example.snap.svg")).exists()
  const mainSnapshot = await Bun.file(join(snapshotDir, "main.snap.svg")).exists()
  
  expect(circuitSnapshot).toBe(true)
  expect(mainSnapshot).toBe(true)

  // Run snapshot test command
  const { stdout: testStdout } = await runCommand("tsci snapshot")
  expect(testStdout).toContain("All snapshots match")
})
