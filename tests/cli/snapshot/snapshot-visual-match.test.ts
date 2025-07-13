import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import { readFile, writeFile } from "node:fs/promises"

const boardCode = `
export const VisualBoard = () => (
  <board width="10mm" height="10mm">
    <chip name="U1" footprint="soic8" />
  </board>
)
`

test("snapshot command ignores non visual changes", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(join(tmpDir, "visual.board.tsx"), boardCode)

  await runCommand("tsci snapshot --update")

  const snapPath = join(tmpDir, "__snapshots__", "visual.board-pcb.snap.svg")
  const original = await readFile(snapPath, "utf-8")
  const withComment = original.replace(
    /<svg[^>]*>/,
    (m) => `${m}\n<!--comment-->`,
  )
  await writeFile(snapPath, withComment)

  const { stdout } = await runCommand("tsci snapshot")
  expect(stdout).toContain("All snapshots match")

  await runCommand("tsci snapshot --update")
  const after = await readFile(snapPath, "utf-8")
  expect(after).toBe(withComment)

  await runCommand("tsci snapshot --update --force-update")
  const forced = await readFile(snapPath, "utf-8")
  expect(forced).not.toContain("<!--comment-->")
}, 10_000)
