import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import fs from "node:fs"
import { listDirRecursive } from "./helpers/list-dir-recursive"

test("snapshot does not create __snapshots__ when custom dir is configured", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ snapshotsDir: "my-custom-snaps" }),
  )

  await Bun.write(
    join(tmpDir, "board.circuit.tsx"),
    `
    export default () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  await runCommand("tsci snapshot --update")

  const structure = listDirRecursive(tmpDir).filter(
    (p) => !p.startsWith(".config"),
  )

  // Verify __snapshots__ is NOT in the structure
  expect(structure).not.toContain("__snapshots__/")

  // Verify custom directory IS in the structure
  expect(structure).toContain("my-custom-snaps/")

  expect(structure).toMatchInlineSnapshot(`
    [
      ".tscircuit/",
      ".tscircuit/cache/",
      ".tscircuit/cache/parts-engine/",
      ".tscircuit/cache/parts-engine/d2c0f2a0d7fcec39ad2b1557390ecef347dabb88ec7f236eeed780580a68f386.json",
      "board.circuit.tsx",
      "my-custom-snaps/",
      "my-custom-snaps/board.circuit-pcb.snap.svg",
      "my-custom-snaps/board.circuit-schematic.snap.svg",
      "tscircuit.config.json",
    ]
  `)
}, 30_000)
