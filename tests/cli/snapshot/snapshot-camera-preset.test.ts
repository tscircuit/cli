import { test, expect } from "bun:test"
import { join } from "node:path"
import fs from "node:fs"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { CAMERA_PRESET_NAMES } from "lib/shared/camera-presets"

const BOARD_TSX = `
export const TestBoard = () => (
  <board width="10mm" height="10mm">
    <chip name="U1" footprint="soic8" />
  </board>
)
`

/** Directory next to this test file where preset snapshots are saved */
const SAVED_SNAPSHOTS_DIR = join(import.meta.dir, "__snapshots__")

for (const preset of CAMERA_PRESET_NAMES) {
  test(`snapshot --camera-preset=${preset} creates 3D snapshot`, async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()

    await Bun.write(join(tmpDir, "test.board.tsx"), BOARD_TSX)

    const { stdout, exitCode } = await runCommand(
      `tsci snapshot --update --camera-preset=${preset}`,
    )

    expect(exitCode).toBe(0)
    expect(stdout).toContain("Created snapshots")

    // --camera-preset implies --3d, so 3D snapshot must exist
    const snapshotDir = join(tmpDir, "__snapshots__")
    expect(fs.existsSync(join(snapshotDir, "test.board-3d.snap.png"))).toBe(
      true,
    )

    // PCB and schematic snapshots should also be generated
    expect(fs.existsSync(join(snapshotDir, "test.board-pcb.snap.svg"))).toBe(
      true,
    )
    expect(
      fs.existsSync(join(snapshotDir, "test.board-schematic.snap.svg")),
    ).toBe(true)

    // The 3D snapshot should be a valid PNG (starts with PNG magic bytes)
    const pngBuf = fs.readFileSync(join(snapshotDir, "test.board-3d.snap.png"))
    expect(pngBuf.length).toBeGreaterThan(0)
    // PNG magic: 0x89 P N G
    expect(pngBuf[0]).toBe(0x89)
    expect(pngBuf[1]).toBe(0x50) // P
    expect(pngBuf[2]).toBe(0x4e) // N
    expect(pngBuf[3]).toBe(0x47) // G

    // Save the generated snapshot with a preset-specific name for inspection
    fs.mkdirSync(SAVED_SNAPSHOTS_DIR, { recursive: true })
    fs.copyFileSync(
      join(snapshotDir, "test.board-3d.snap.png"),
      join(SAVED_SNAPSHOTS_DIR, `3d-${preset}.snap.png`),
    )
  }, 60_000)
}
