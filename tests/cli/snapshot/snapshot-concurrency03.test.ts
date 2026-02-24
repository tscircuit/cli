import { expect, test } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import "bun-match-svg"

const validCircuitCode = `
export const ValidBoard = () => (
  <board width="10mm" height="10mm">
    <chip name="U1" footprint="soic8" />
  </board>
)`

const invalidCircuitCode = `
export const InvalidBoard = () => {
  throw new Error("intentional error")
}
`

test.skip("snapshot with --concurrency handles errors correctly", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(join(tmpDir, "valid.circuit.tsx"), validCircuitCode)
  await Bun.write(join(tmpDir, "invalid.circuit.tsx"), invalidCircuitCode)

  const { stdout, exitCode } = await runCommand(
    "tsci snapshot --concurrency 2 --update",
  )

  const snapDir = join(tmpDir, "__snapshots__")
  const validPcbExists = await Bun.file(
    join(snapDir, "valid-pcb.snap.svg"),
  ).exists()
  const validSchExists = await Bun.file(
    join(snapDir, "valid-schematic.snap.svg"),
  ).exists()

  expect(validPcbExists).toBe(true)
  expect(validSchExists).toBe(true)

  expect(stdout).toContain("with concurrency 2")
  expect(exitCode).toBe(1)
}, 60_000)
