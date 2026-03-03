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

test("snapshot --camera-preset without --3d still generates 3D snapshot", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(join(tmpDir, "test.board.tsx"), BOARD_TSX)

  // No explicit --3d flag; --camera-preset should imply it
  const { stdout, exitCode } = await runCommand(
    "tsci snapshot --update --camera-preset=top-down",
  )

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Created snapshots")

  const snapshotDir = join(tmpDir, "__snapshots__")
  expect(fs.existsSync(join(snapshotDir, "test.board-3d.snap.png"))).toBe(true)
}, 60_000)
