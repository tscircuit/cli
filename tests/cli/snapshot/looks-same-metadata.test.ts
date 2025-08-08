import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import fs from "node:fs"
import "bun-match-svg"

test("snapshot does not update on metadata-only changes", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "meta.board.tsx"),
    `
    export const MetaBoard = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  await runCommand("tsci snapshot --update")

  const snapDir = join(tmpDir, "__snapshots__")
  const pcbPath = join(snapDir, "meta.board-pcb.snap.svg")
  let originalSvg = await Bun.file(pcbPath).text()

  // Insert metadata
  let mutatedSvg = originalSvg.replace(
    /data-software-used-string="[^"]*"/,
    `data-software-used-string="@tscircuit/core@0.0.999"`,
  )
  if (!/data-software-used-string=/.test(mutatedSvg)) {
    mutatedSvg = mutatedSvg.replace(
      "<svg ",
      `<svg data-software-used-string="@tscircuit/core@0.0.999" `,
    )
  }
  await Bun.write(pcbPath, mutatedSvg)

  // mtime checks
  const statsBefore = fs.statSync(pcbPath)
  const { stdout } = await runCommand("tsci snapshot --update")
  expect(stdout).toContain("✅")
  expect(stdout).not.toContain("Created snapshots")
  const statsAfter = fs.statSync(pcbPath)
  expect(statsAfter.mtimeMs).toBe(statsBefore.mtimeMs)

  // no diff image
  const diffPath = join(snapDir, "meta.board-pcb.diff.png")
  const diffExists = fs.existsSync(diffPath)
  expect(diffExists).toBe(false)
}, 30_000)
