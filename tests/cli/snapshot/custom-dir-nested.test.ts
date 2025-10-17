import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import fs from "node:fs"
import { listDirRecursive } from "./helpers/list-dir-recursive"

test("snapshot with custom snapshotsDir in nested directories", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create config with custom snapshotsDir
  await Bun.write(
    join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ snapshotsDir: "snapshots" }),
  )

  // Create nested directory structure
  const circuitsDir = join(tmpDir, "circuits")
  const pcbDir = join(tmpDir, "pcb")
  fs.mkdirSync(circuitsDir, { recursive: true })
  fs.mkdirSync(pcbDir, { recursive: true })

  // Create circuit files in different directories
  await Bun.write(
    join(circuitsDir, "led.circuit.tsx"),
    `
    export default () => (
      <board width="10mm" height="10mm">
        <chip name="LED1" footprint="led_0805" />
      </board>
    )
  `,
  )

  await Bun.write(
    join(pcbDir, "main.board.tsx"),
    `
    export default () => (
      <board width="20mm" height="20mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  const { stdout } = await runCommand("tsci snapshot --update")
  expect(stdout).toContain("Created snapshots")

  // Get the directory structure (filter out .config directory)
  const structure = listDirRecursive(tmpDir).filter(
    (p) => !p.startsWith(".config"),
  )

  expect(structure).toMatchInlineSnapshot(`
[
  "circuits/",
  "circuits/led.circuit.tsx",
  "circuits/snapshots/",
  "circuits/snapshots/led.circuit-pcb.snap.svg",
  "circuits/snapshots/led.circuit-schematic.snap.svg",
  "pcb/",
  "pcb/main.board.tsx",
  "pcb/snapshots/",
  "pcb/snapshots/main.board-pcb.snap.svg",
  "pcb/snapshots/main.board-schematic.snap.svg",
  "tscircuit.config.json",
]
`)
}, 30_000)
