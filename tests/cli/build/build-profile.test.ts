import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"

const circuitCode = (name: string) => `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="${name}" schX={3} pcbX={3} />
  </board>
)`

test("build with --profile logs per-circuit circuit.json generation time", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(path.join(tmpDir, "first.circuit.tsx"), circuitCode("R1"))
  await writeFile(path.join(tmpDir, "second.circuit.tsx"), circuitCode("R2"))
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stdout, exitCode } = await runCommand("tsci build --profile")

  expect(exitCode).toBe(0)
  expect(stdout).toContain("[profile] first.circuit.tsx:")
  expect(stdout).toContain("[profile] second.circuit.tsx:")
  expect(stdout).toContain("Profile Summary (slowest first)")

  const profileSummaryLines = stdout
    .split("\n")
    .filter((line) => line.trim().match(/^[0-9]+\.[0-9]ms\s+/))

  expect(profileSummaryLines.length).toBeGreaterThanOrEqual(2)

  const durations = profileSummaryLines.map((line) => {
    const match = line.trim().match(/^([0-9]+\.[0-9])ms\s+/)
    return match ? Number.parseFloat(match[1]) : Number.NaN
  })

  for (let i = 1; i < durations.length; i++) {
    expect(durations[i - 1] >= durations[i]).toBe(true)
  }
}, 30_000)
