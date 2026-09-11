import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

// https://github.com/tscircuit/cli/issues/4707
const badTraceCircuit = `
export default () => (
  <board width="12mm" height="8mm">
    <resistor name="R1" resistance="1k" footprint="0603" />
    <trace from="R1.pin1" to="R_MISSING.pin1" />
  </board>
)`

test("build exits 1 when a trace targets a nonexistent component", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "bad-trace.tsx"), badTraceCircuit)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stdout } = await runCommand("tsci build bad-trace.tsx")

  expect(exitCode).toBe(1)
  // the circuit must not be counted as passed
  expect(stdout).toContain("0 passed")
  expect(stdout).toContain("1 failed")
}, 30_000)

test("build with --ignore-errors still exits 0 for circuit errors", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "bad-trace.tsx"), badTraceCircuit)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode } = await runCommand(
    "tsci build bad-trace.tsx --ignore-errors",
  )

  expect(exitCode).toBe(0)
}, 30_000)
