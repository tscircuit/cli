import { test, expect } from "bun:test"
import { join } from "node:path"
import fs from "node:fs"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const BOARD_TSX = `
export const TestBoard = () => (
  <board width="10mm" height="10mm">
    <chip name="U1" footprint="soic8" />
  </board>
)
`

test("different camera presets produce different 3D snapshots", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(join(tmpDir, "test.board.tsx"), BOARD_TSX)

  // Generate with top-down
  await runCommand("tsci snapshot --update --camera-preset=top-down")
  const snapshotDir = join(tmpDir, "__snapshots__")
  const topDownPng = fs.readFileSync(
    join(snapshotDir, "test.board-3d.snap.png"),
  )

  // Generate with front (overwrites the snapshot)
  await runCommand("tsci snapshot --update --camera-preset=front")
  const frontPng = fs.readFileSync(join(snapshotDir, "test.board-3d.snap.png"))

  // The two images should differ
  expect(Buffer.compare(topDownPng, frontPng)).not.toBe(0)
}, 90_000)
