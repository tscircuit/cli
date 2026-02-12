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
      ".tscircuit/",
      ".tscircuit/cache/",
      ".tscircuit/cache/___soic8__-716387b643045a05273bbfc4ba8420a9.json",
      "circuits/",
      "circuits/led.circuit.tsx",
      "pcb/",
      "pcb/main.board.tsx",
      "snapshots/",
      "snapshots/circuits/",
      "snapshots/circuits/led.circuit-pcb.snap.svg",
      "snapshots/circuits/led.circuit-schematic.snap.svg",
      "snapshots/pcb/",
      "snapshots/pcb/main.board-pcb.snap.svg",
      "snapshots/pcb/main.board-schematic.snap.svg",
      "tscircuit.config.json",
    ]
  `)
}, 30_000)
