import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"

test("snapshot command creates SVG snapshots", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "test.board.tsx"),
    `
    export const TestBoard = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  const { stdout: updateStdout } = await runCommand("tsci snapshot --update")
  expect(updateStdout).toContain("Created snapshots")

  const snapshotDir = join(tmpDir, "__snapshots__")
  const pcbSnapshot = await Bun.file(
    join(snapshotDir, "test.board-pcb.snap.svg"),
  ).exists()
  const schSnapshot = await Bun.file(
    join(snapshotDir, "test.board-schematic.snap.svg"),
  ).exists()

  expect(pcbSnapshot).toBe(true)
  expect(schSnapshot).toBe(true)

  const pcbContent = await Bun.file(
    join(snapshotDir, "test.board-pcb.snap.svg"),
  ).text()
  const schContent = await Bun.file(
    join(snapshotDir, "test.board-schematic.snap.svg"),
  ).text()

  expect(pcbContent.trim().length).toBeGreaterThan(0)
  expect(pcbContent).toContain("<svg")
  expect(schContent.trim().length).toBeGreaterThan(0)
  expect(schContent).toContain("<svg")

  const { stdout: testStdout } = await runCommand("tsci snapshot")
  expect(testStdout).toContain("All snapshots match")
}, 10_000)
