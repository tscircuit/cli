import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"

test("snapshot --show-courtyards includes courtyard elements in PCB SVG", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "test.board.tsx"),
    `
    export const TestBoard = () => (
      <board width="10mm" height="10mm">
        <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
      </board>
    )
  `,
  )

  await runCommand("tsci snapshot --update --show-courtyards --pcb-only")

  const snapDir = join(tmpDir, "__snapshots__")
  const svg = await Bun.file(join(snapDir, "test.board-pcb.snap.svg")).text()

  expect(svg).toContain("pcb-courtyard-")
}, 60_000)

test("snapshot --show-courtyards overrides project config when not set", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ pcbSnapshotSettings: { showCourtyards: false } }),
  )

  await Bun.write(
    join(tmpDir, "test.board.tsx"),
    `
    export const TestBoard = () => (
      <board width="10mm" height="10mm">
        <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
      </board>
    )
  `,
  )

  await runCommand("tsci snapshot --update --show-courtyards --pcb-only")

  const snapDir = join(tmpDir, "__snapshots__")
  const svg = await Bun.file(join(snapDir, "test.board-pcb.snap.svg")).text()

  expect(svg).toContain("pcb-courtyard-")
}, 60_000)
