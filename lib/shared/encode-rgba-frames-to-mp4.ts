import { execFile, spawn } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { promisify } from "node:util"

export const isFfmpegAvailable = async () => {
  try {
    await promisify(execFile)("ffmpeg", ["-version"])
    return true
  } catch {
    return false
  }
}

/** Streams raw RGBA frames to FFmpeg without retaining the movie in memory. */
export async function encodeRgbaFramesToMp4({
  frames,
  width,
  height,
  fps,
  videoName,
}: {
  frames: AsyncIterable<Uint8Array>
  width: number
  height: number
  fps: number
  /** Used in error messages, e.g. "explosion video". */
  videoName: string
}): Promise<Buffer> {
  const directory = await mkdtemp(path.join(tmpdir(), "tsci-video-"))
  const output = path.join(directory, "video.mp4")
  const encoder = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "rawvideo",
      "-pixel_format",
      "rgba",
      "-video_size",
      `${width}x${height}`,
      "-framerate",
      String(fps),
      "-i",
      "pipe:0",
      "-an",
      // Use canonical color conversion and encoding across CPU architectures.
      "-sws_flags",
      "+accurate_rnd+bitexact",
      "-c:v",
      "libx264",
      "-x264-params",
      "cpu-independent=1",
      "-threads",
      "1",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      output,
    ],
    { stdio: ["pipe", "ignore", "pipe"] },
  )
  let stderr = ""
  encoder.stderr.on("data", (chunk) => {
    stderr = (stderr + chunk).slice(-16_384)
  })
  const completed = new Promise<void>((resolve, reject) => {
    encoder.once("error", reject)
    encoder.once("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`FFmpeg failed (${code}): ${stderr.trim()}`)),
    )
  })
  try {
    await Promise.all([
      pipeline(Readable.from(frames), encoder.stdin),
      completed,
    ])
    return await readFile(output)
  } catch (error) {
    encoder.kill()
    await completed.catch(() => {})
    throw new Error(
      `Could not encode ${videoName}: ${stderr.trim() || String(error)}`,
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
