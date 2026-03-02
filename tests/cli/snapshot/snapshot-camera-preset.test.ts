import { test, expect } from "bun:test"
import { join } from "node:path"
import fs from "node:fs"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import {
  CAMERA_PRESET_NAMES,
  type CameraPreset,
} from "lib/shared/camera-presets"

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

test("snapshot --camera-preset with invalid preset fails", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(join(tmpDir, "test.board.tsx"), BOARD_TSX)

  const { stderr, exitCode } = await runCommand(
    "tsci snapshot --update --camera-preset=bogus-preset",
  )

  expect(exitCode).not.toBe(0)
  expect(stderr).toContain('Unknown camera preset "bogus-preset"')
}, 30_000)

test("snapshot --camera-preset without --3d still generates 3D snapshot", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(join(tmpDir, "test.board.tsx"), BOARD_TSX)

  // No explicit --3d flag; --camera-preset should imply it
  const { stdout, exitCode } = await runCommand(
    "tsci snapshot --update --camera-preset=top-down",
  )

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Created snapshots")

  const snapshotDir = join(tmpDir, "__snapshots__")
  expect(fs.existsSync(join(snapshotDir, "test.board-3d.snap.png"))).toBe(true)
}, 60_000)

test("different camera presets produce different 3D snapshots", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(join(tmpDir, "test.board.tsx"), BOARD_TSX)

  // Generate with top-down
  await runCommand("tsci snapshot --update --camera-preset=top-down")
  const snapshotDir = join(tmpDir, "__snapshots__")
  const topDownPng = fs.readFileSync(
    join(snapshotDir, "test.board-3d.snap.png"),
  )

  // Generate with front (overwrites the snapshot)
  await runCommand("tsci snapshot --update --camera-preset=front")
  const frontPng = fs.readFileSync(join(snapshotDir, "test.board-3d.snap.png"))

  // The two images should differ
  expect(Buffer.compare(topDownPng, frontPng)).not.toBe(0)
}, 90_000)
