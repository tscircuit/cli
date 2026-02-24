import { expect, test } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import "bun-match-svg"

const circuitCode = `
export const TestBoard = () => (
  <board width="10mm" height="10mm">
    <chip name="U1" footprint="soic8" />
  </board>
)`

test.skip("snapshot without --concurrency defaults to sequential", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(join(tmpDir, "test.circuit.tsx"), circuitCode)

  const { stdout } = await runCommand("tsci snapshot --update")

  expect(stdout).not.toContain("with concurrency")

  const snapDir = join(tmpDir, "__snapshots__")
  const pcbExists = await Bun.file(join(snapDir, "test-pcb.snap.svg")).exists()
  const schExists = await Bun.file(
    join(snapDir, "test-schematic.snap.svg"),
  ).exists()
  expect(pcbExists).toBe(true)
  expect(schExists).toBe(true)
}, 30_000)
