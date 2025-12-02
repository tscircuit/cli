import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { Buffer } from "node:buffer"
import looksSame from "looks-same"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const SNAPSHOT_DIR = path.join(import.meta.dir, "__snapshots__")
const SNAPSHOT_TIMEOUT_MS = 45_000

const BOARD_FIXTURES = [
  {
    name: "small",
    fileName: "small.board.tsx",
    snapshotFile: "small.board-3d.snap.png",
    baseline: "camera-position-small.snap.png",
    source: `
      export default function SmallBoard() {
        return (
          <board width="8mm" height="8mm">
            <resistor name="R1" resistance="1k" footprint="0402" />
          </board>
        )
      }
    `,
  },
  {
    name: "medium",
    fileName: "medium.board.tsx",
    snapshotFile: "medium.board-3d.snap.png",
    baseline: "camera-position-medium.snap.png",
    source: `
      export default function MediumBoard() {
        return (
          <board width="30mm" height="20mm">
            <chip name="U1" footprint="soic8" />
            <resistor name="R1" resistance="1k" footprint="0603" pcbX={-6} pcbY={6} />
            <capacitor
              name="C1"
              capacitance="10uF"
              footprint="0603"
              pcbX={6}
              pcbY={-6}
            />
          </board>
        )
      }
    `,
  },
  {
    name: "large",
    fileName: "large.board.tsx",
    snapshotFile: "large.board-3d.snap.png",
    baseline: "camera-position-large.snap.png",
    source: `
      export default function LargeBoard() {
        return (
          <board width="80mm" height="50mm">
            <resistor name="R1" resistance="10k" footprint="0805" pcbX={-25} pcbY={15} />
            <resistor name="R2" resistance="4.7k" footprint="0805" pcbX={25} pcbY={-15} />
            <capacitor name="C1" capacitance="100nF" footprint="0603" pcbX={-30} pcbY={-10} />
            <capacitor name="C2" capacitance="4.7uF" footprint="0603" pcbX={30} pcbY={20} />
            <inductor name="L1" inductance="10uH" footprint="0603" pcbX={0} pcbY={0} />
            <trace from=".R1 > .pos" to=".C1 > .pos" />
            <trace from=".R2 > .pos" to=".C2 > .pos" />
            <trace from=".C1 > .neg" to=".C2 > .neg" />
          </board>
        )
      }
    `,
  },
]

const toUint8Array = (value: ArrayBuffer | Uint8Array): Uint8Array => {
  return value instanceof Uint8Array ? value : new Uint8Array(value)
}

const ensureSnapshotDir = () => fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })

const shouldUpdateSnapshot = () =>
  Boolean(process.env.UPDATE_CAMERA_SNAPSHOT || process.env.UPDATE_SNAPSHOTS)

const expectPngToMatchBaseline = async (
  baselineName: string,
  pngBytes: ArrayBuffer,
) => {
  ensureSnapshotDir()
  const baselinePath = path.join(SNAPSHOT_DIR, baselineName)
  const pngArray = toUint8Array(pngBytes)
  const pngBuffer = Buffer.from(pngArray)

  const baselineExists = fs.existsSync(baselinePath)

  if (!baselineExists) {
    await Bun.write(baselinePath, pngBuffer)
    console.info(`Snapshot baseline created at ${baselinePath}`)
    return
  }

  if (shouldUpdateSnapshot()) {
    await Bun.write(baselinePath, pngBuffer)
  }

  const baselineBytes = toUint8Array(await Bun.file(baselinePath).arrayBuffer())
  const baselineBuffer = Buffer.from(baselineBytes)
  const comparison = await looksSame(baselineBuffer, pngBuffer, {
    tolerance: 3,
    strict: false,
    ignoreAntialiasing: true,
  })

  if (!comparison.equal) {
    const diffPath = baselinePath.replace(/\.png$/, ".diff.png")
    await looksSame.createDiff({
      reference: baselineBuffer,
      current: pngBuffer,
      diff: diffPath,
      highlightColor: "#ff00ff",
    })
    throw new Error(
      `Snapshot mismatch for ${baselineName}. Visual diff saved to ${diffPath}`,
    )
  }
}

for (const fixture of BOARD_FIXTURES) {
  test(
    `tsci snapshot renders stable 3d preview for ${fixture.name} board`,
    async () => {
      const { tmpDir, runCommand } = await getCliTestFixture()
      const boardPath = path.join(tmpDir, fixture.fileName)
      await Bun.write(boardPath, fixture.source)

      const { stdout: updateStdout } = await runCommand(
        `tsci snapshot ${fixture.fileName} --update --3d`,
      )
      expect(updateStdout).toContain("Created snapshots")

      const generatedSnapshotPath = path.join(
        tmpDir,
        "__snapshots__",
        fixture.snapshotFile,
      )
      const pngBuffer = await Bun.file(generatedSnapshotPath).arrayBuffer()
      await expectPngToMatchBaseline(fixture.baseline, pngBuffer)

      const { stdout: verifyStdout } = await runCommand(
        `tsci snapshot ${fixture.fileName} --3d`,
      )
      expect(verifyStdout).toContain("All snapshots match")
    },
    { timeout: SNAPSHOT_TIMEOUT_MS },
  )
}
