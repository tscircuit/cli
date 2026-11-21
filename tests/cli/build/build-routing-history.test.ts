import { expect, test } from "bun:test"
import { execFile } from "node:child_process"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const run = promisify(execFile)

const circuitCode = (pcbX: number) => `
export default () => (
  <board width="20mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-${pcbX}} />
    <capacitor capacitance="1uF" footprint="0402" name="C1" pcbX={${pcbX}} />
    <trace from=".R1 > .pin2" to=".C1 > .pin1" />
  </board>
)`

test("build --routing-history writes an mp4 replaying every build", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "my-board.circuit.tsx")
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await writeFile(circuitPath, circuitCode(3))
  expect((await runCommand("tsci build")).exitCode).toBe(0)

  await writeFile(circuitPath, circuitCode(6))
  const { stdout, exitCode } = await runCommand("tsci build --routing-history")
  expect(exitCode).toBe(0)
  expect(stdout).toContain(
    "Written dist/my-board/routing-history.mp4 (2 builds)",
  )

  const videoPath = path.join(tmpDir, "dist", "my-board", "routing-history.mp4")
  const stream = JSON.parse(
    (
      await run("ffprobe", [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-count_frames",
        "-show_streams",
        "-of",
        "json",
        videoPath,
      ])
    ).stdout,
  ).streams[0]
  expect(stream.codec_name).toBe("h264")
  expect(stream.pix_fmt).toBe("yuv420p")
  expect([stream.width, stream.height]).toEqual([960, 720])
  // At least the minimum playback time plus the hold on the newest build.
  expect(Number(stream.nb_read_frames)).toBeGreaterThanOrEqual(120)
  await run("ffmpeg", ["-v", "error", "-i", videoPath, "-f", "null", "-"])
}, 120_000)
