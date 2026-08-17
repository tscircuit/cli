import { expect, test } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("snapshot --component-name focuses a PCB snapshot on one component", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "test.board.tsx"),
    `
      export const TestBoard = () => (
        <board width="20mm" height="10mm">
          <resistor name="R1" resistance="1k" footprint="0402" pcbX={-6} />
          <resistor name="R2" resistance="2k" footprint="0402" pcbX={6} />
        </board>
      )
    `,
  )

  await runCommand("tsci snapshot --update --component-name R1")

  const snapshotPath = join(
    tmpDir,
    "__snapshots__",
    "test.board-R1-pcb.snap.svg",
  )
  const svg = await Bun.file(snapshotPath).text()

  await runCommand("tsci snapshot --update --show-courtyards --pcb-only")
  const fullBoardSvg = await Bun.file(
    join(tmpDir, "__snapshots__", "test.board-pcb.snap.svg"),
  ).text()

  expect(svg).toContain("R1")
  expect(svg).toContain("pcb-courtyard-")
  expect(svg).not.toBe(fullBoardSvg)
  expect(
    await Bun.file(
      join(tmpDir, "__snapshots__", "test.board-R1-schematic.snap.svg"),
    ).exists(),
  ).toBe(false)
}, 60_000)
