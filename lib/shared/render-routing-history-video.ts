import fs from "node:fs"
import { strokeWidthRatio } from "@tscircuit/alphabet"
import { Resvg } from "@resvg/resvg-js"
import type { AnyCircuitElement } from "circuit-json"
import type { CircuitJsonBuildHistoryEntry } from "./circuit-json-build-history"
import {
  encodeRgbaFramesToMp4,
  isFfmpegAvailable,
} from "./encode-rgba-frames-to-mp4"
import { convertCircuitJsonToPcbSvg } from "./render-pcb-svg"
import {
  getRoutingHistoryTimeline,
  type RoutingHistoryFrame,
  type RoutingHistoryTimeline,
} from "./routing-history-timeline"
import {
  getStrokeTextAdvance,
  getStrokeTextSvgPath,
} from "./stroke-text-svg-path"

const VIDEO_WIDTH = 960
const VIDEO_HEIGHT = 720
const VIDEO_FPS = 24
const TIMELINE_HEIGHT = 80
const TIMELINE_MARGIN_X = 24
const TRACK_Y = 56
const TEXT_SIZE = 16
const TEXT_BASELINE_Y = 30

const pad = (value: number) => String(value).padStart(2, "0")

const formatElapsed = (elapsedMs: number) => {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return `+${days}d ${pad(hours)}h`
  if (hours > 0) return `+${hours}h ${pad(minutes)}m`
  if (minutes > 0) return `+${minutes}m ${pad(seconds)}s`
  return `+${seconds}s`
}

const formatLocalDateTime = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`

const formatSpeedup = (speedup: number) =>
  `${speedup >= 10 ? Math.round(speedup) : Number(speedup.toFixed(1))}x`

const renderSvgPixels = (svg: string, { loadSystemFonts = true } = {}) =>
  Buffer.from(
    new Resvg(svg, {
      background: "#000000",
      font: { loadSystemFonts },
    }).render().pixels,
  )

const renderPcb = (circuitJsonPath: string, width: number, height: number) => {
  try {
    const circuitJson: AnyCircuitElement[] = JSON.parse(
      fs.readFileSync(circuitJsonPath, "utf-8"),
    )
    return renderSvgPixels(
      convertCircuitJsonToPcbSvg(circuitJson, { width, height }),
    )
  } catch {
    // A build that cannot be drawn is still a point in time worth showing.
    return renderSvgPixels(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path d="${getStrokeTextSvgPath({ text: "Could not render this build", x: 24, baselineY: 48, size: TEXT_SIZE })}" stroke="#94a3b8" stroke-width="${TEXT_SIZE * strokeWidthRatio}" stroke-linecap="round" fill="none"/></svg>`,
    )
  }
}

const renderTimeline = ({
  frame,
  timeline,
  firstBuildTimeMs,
  width,
}: {
  frame: RoutingHistoryFrame
  timeline: RoutingHistoryTimeline
  firstBuildTimeMs: number
  width: number
}) => {
  const trackWidth = width - TIMELINE_MARGIN_X * 2
  const getX = (progress: number) => TIMELINE_MARGIN_X + progress * trackWidth
  const playheadX = getX(frame.progress)
  const buildCount = timeline.buildProgress.length

  const track = timeline.buildProgress
    .slice(0, -1)
    .map(
      (progress, index) =>
        `<line x1="${getX(progress)}" y1="${TRACK_Y}" x2="${getX(timeline.buildProgress[index + 1]!)}" y2="${TRACK_Y}" stroke="#334155" stroke-width="4"${timeline.isGapCompressed[index] ? ' stroke-dasharray="3 5"' : ""}/>`,
    )
    .join("")
  const ticks = timeline.buildProgress
    .map(
      (progress, index) =>
        `<line x1="${getX(progress)}" y1="${TRACK_Y - 8}" x2="${getX(progress)}" y2="${TRACK_Y + 8}" stroke="${index <= frame.buildIndex ? "#7dd3fc" : "#64748b"}" stroke-width="2"/>`,
    )
    .join("")

  const leftText = `Build ${frame.buildIndex + 1}/${buildCount}   ${formatElapsed(frame.timeMs - firstBuildTimeMs)}`
  const rightText = `${formatLocalDateTime(new Date(frame.timeMs))}   ${formatSpeedup(timeline.speedup)}`
  const text = [
    getStrokeTextSvgPath({
      text: leftText,
      x: TIMELINE_MARGIN_X,
      baselineY: TEXT_BASELINE_Y,
      size: TEXT_SIZE,
    }),
    getStrokeTextSvgPath({
      text: rightText,
      x:
        width - TIMELINE_MARGIN_X - getStrokeTextAdvance(rightText) * TEXT_SIZE,
      baselineY: TEXT_BASELINE_Y,
      size: TEXT_SIZE,
    }),
  ].join(" ")

  return renderSvgPixels(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${TIMELINE_HEIGHT}"><rect width="100%" height="100%" fill="#0f172a"/>${track}<line x1="${getX(0)}" y1="${TRACK_Y}" x2="${playheadX}" y2="${TRACK_Y}" stroke="#0ea5e9" stroke-width="4"/>${ticks}<circle cx="${playheadX}" cy="${TRACK_Y}" r="6" fill="#ffffff"/><path d="${text}" stroke="#e2e8f0" stroke-width="${TEXT_SIZE * strokeWidthRatio}" stroke-linecap="round" fill="none"/></svg>`, // The timeline is redrawn every frame and only uses stroke text, so skip
    // the slow system font scan.
    { loadSystemFonts: false },
  )
}

/**
 * Renders the PCB of every build in the history as an MP4 with a timeline
 * along the bottom. Playback time is proportional to the real time between
 * builds, so the video shows where development time went.
 */
export async function renderRoutingHistoryVideo(
  history: CircuitJsonBuildHistoryEntry[],
): Promise<Buffer> {
  if (history.length === 0) {
    throw new Error("No builds found to render a routing history video.")
  }
  if (!(await isFfmpegAvailable())) {
    throw new Error(
      "Routing history MP4 output requires FFmpeg. Install ffmpeg and make sure it is on PATH.",
    )
  }

  const timeline = getRoutingHistoryTimeline({
    buildTimesMs: history.map((entry) => entry.createdAt.getTime()),
    fps: VIDEO_FPS,
  })
  const pcbHeight = VIDEO_HEIGHT - TIMELINE_HEIGHT
  const firstBuildTimeMs = history[0]!.createdAt.getTime()

  async function* rgbaFrames() {
    // Builds are shown in order, so only the current PCB image is retained.
    let renderedBuildIndex = -1
    let pcb!: Buffer
    for (const frame of timeline.frames) {
      if (frame.buildIndex !== renderedBuildIndex) {
        pcb = renderPcb(
          history[frame.buildIndex]!.circuitJsonPath,
          VIDEO_WIDTH,
          pcbHeight,
        )
        renderedBuildIndex = frame.buildIndex
      }
      yield Buffer.concat([
        pcb,
        renderTimeline({
          frame,
          timeline,
          firstBuildTimeMs,
          width: VIDEO_WIDTH,
        }),
      ])
    }
  }

  return encodeRgbaFramesToMp4({
    frames: rgbaFrames(),
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    fps: VIDEO_FPS,
    videoName: "routing history video",
  })
}
