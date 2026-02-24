import { expect, test } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import "bun-match-svg"

const circuitCode = (name: string) => `
export const ${name} = () => (
  <board width="10mm" height="10mm">
    <chip name="U1" footprint="soic8" />
  </board>
)`

test.skip("snapshot with --concurrency builds multiple files in parallel", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const circuitFiles = [
    "first.circuit.tsx",
    "second.circuit.tsx",
    "third.circuit.tsx",
  ]

  for (const file of circuitFiles) {
    const name = file
      .replace(".circuit.tsx", "")
      .replace(/^\w/, (c) => c.toUpperCase())
    await Bun.write(join(tmpDir, file), circuitCode(name))
  }

  const { stdout } = await runCommand("tsci snapshot --concurrency 2 --update")

  expect(stdout).toContain("with concurrency 2")

  const snapDir = join(tmpDir, "__snapshots__")
  for (const file of circuitFiles) {
    const base = file.replace(".circuit.tsx", "")
    const pcbExists = await Bun.file(
      join(snapDir, `${base}-pcb.snap.svg`),
    ).exists()
    const schExists = await Bun.file(
      join(snapDir, `${base}-schematic.snap.svg`),
    ).exists()
    expect(pcbExists).toBe(true)
    expect(schExists).toBe(true)
  }
}, 60_000)
