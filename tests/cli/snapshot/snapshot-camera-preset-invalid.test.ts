import { test, expect } from "bun:test"
import { join } from "node:path"
import fs from "node:fs"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const BOARD_TSX = `
export const TestBoard = () => (
  <board width="10mm" height="10mm">
    <chip name="U1" footprint="soic8" />
  </board>
)
`

test("snapshot --camera-preset with invalid preset fails", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(join(tmpDir, "test.board.tsx"), BOARD_TSX)

  const { stderr, exitCode } = await runCommand(
    "tsci snapshot --update --camera-preset=bogus-preset",
  )

  expect(exitCode).not.toBe(0)
  expect(stderr).toContain('Unknown camera preset "bogus-preset"')
}, 30_000)
