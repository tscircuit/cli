import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import { listDirRecursive } from "./helpers/list-dir-recursive"

test("snapshot defaults to __snapshots__ when no config", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // No config file - should use default __snapshots__
  await Bun.write(
    join(tmpDir, "default.board.tsx"),
    `
    export default () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  const { stdout } = await runCommand("tsci snapshot --update")
  expect(stdout).toContain("Created snapshots")

  // Get the directory structure (filter out .config directory)
  const structure = listDirRecursive(tmpDir).filter(
    (p) => !p.startsWith(".config"),
  )

  expect(structure).toMatchInlineSnapshot(`
    [
      ".tscircuit/",
      ".tscircuit/cache/",
      ".tscircuit/cache/___soic8__-716387b643045a05273bbfc4ba8420a9.json",
      "__snapshots__/",
      "__snapshots__/default.board-pcb.snap.svg",
      "__snapshots__/default.board-schematic.snap.svg",
      "default.board.tsx",
    ]
  `)
}, 30_000)
