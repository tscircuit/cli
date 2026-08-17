import { expect, test } from "bun:test"
import "bun-match-svg"
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

  expect(svg).toMatchSvgSnapshot(import.meta.path, "component-name-R1")
}, 60_000)
