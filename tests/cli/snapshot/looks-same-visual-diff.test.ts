import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import fs from "node:fs"

test("CLI detects visual change when another chip is added", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const boardPath = join(tmpDir, "meta.board.tsx")

  // Create original board with 1 chip
  await Bun.write(
    boardPath,
    `
    export const MetaBoard = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  // Generate initial snapshot
  await runCommand("tsci snapshot --update")

  // Read existing snapshot
  const snapPath = join(tmpDir, "__snapshots__", "meta.board-pcb.snap.svg")
  const originalSvg = fs.readFileSync(snapPath, "utf-8")

  // Mutate SVG: add a red rect visually simulating a chip added
  const mutatedSvg = originalSvg.replace(
    "</svg>",
    `<rect x="200" y="200" width="50" height="50" fill="red" />\n</svg>`,
  )

  // Overwrite snapshot with mutated SVG
  fs.writeFileSync(snapPath, mutatedSvg)

  // Run snapshot again, expect visual diff detected
  const { stdout, stderr } = await runCommand("tsci snapshot")
  expect(stdout).not.toContain("All snapshots match")
  expect(stderr).toContain(".diff.svg")

  const diffPath = join(tmpDir, "__snapshots__", "meta.board-pcb.diff.svg")
  const diffExists = fs.existsSync(diffPath)
  expect(diffExists).toBe(true)
})
