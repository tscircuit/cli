import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import "bun-match-svg"

test("snapshot command creates diff images for pcb, schematic and 3d when visuals change", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "diff-test.board.tsx"),
    `
    export const Mismatch = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  await runCommand("tsci snapshot --update --3d")

  await Bun.write(
    join(tmpDir, "diff-test.board.tsx"),
    `
    export const Mismatch = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
        <chip name="U2" footprint="soic8" schX={-3} pcbX={-3} />
      </board>
    )
  `,
  )

  const { stderr } = await runCommand("tsci snapshot --3d")
  expect(stderr).toContain("Snapshot mismatch")

  const snapDir = join(tmpDir, "__snapshots__")
  const pcbDiff = await Bun.file(
    join(snapDir, "diff-test.board-pcb.diff.svg"),
  ).exists()
  const schDiff = await Bun.file(
    join(snapDir, "diff-test.board-schematic.diff.svg"),
  ).exists()
  const threeDDiff = await Bun.file(
    join(snapDir, "diff-test.board-3d.diff.png"),
  ).exists()

  expect(pcbDiff).toBe(true)
  expect(schDiff).toBe(true)
  expect(threeDDiff).toBe(true)
}, 30_000)
