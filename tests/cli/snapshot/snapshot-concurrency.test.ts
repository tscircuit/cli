import { expect, test } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("snapshot supports --concurrency with worker threads", async () => {
  if (process.env.CI) {
    return
  }
  const { tmpDir, runCommand } = await getCliTestFixture()

  await runCommand("tsci init")

  await Bun.write(
    join(tmpDir, "first.board.tsx"),
    `
    export const FirstBoard = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  await Bun.write(
    join(tmpDir, "second.board.tsx"),
    `
    export const SecondBoard = () => (
      <board width="10mm" height="10mm">
        <chip name="U2" footprint="soic8" />
      </board>
    )
  `,
  )

  const { stdout, exitCode } = await runCommand(
    "tsci snapshot --update --concurrency 2",
  )

  expect(exitCode).toBe(0)
  expect(stdout).toContain("with concurrency 2")
  expect(stdout).toContain("Created snapshots")

  const snapDir = join(tmpDir, "__snapshots__")
  expect(
    await Bun.file(join(snapDir, "first.board-pcb.snap.svg")).exists(),
  ).toBe(true)
  expect(
    await Bun.file(join(snapDir, "first.board-schematic.snap.svg")).exists(),
  ).toBe(true)
  expect(
    await Bun.file(join(snapDir, "second.board-pcb.snap.svg")).exists(),
  ).toBe(true)
  expect(
    await Bun.file(join(snapDir, "second.board-schematic.snap.svg")).exists(),
  ).toBe(true)
}, 45_000)
