/** One real minute of build history plays back in one second of video. */
const DEFAULT_SPEEDUP = 60
const MIN_PLAYBACK_SECONDS = 3
const MAX_PLAYBACK_SECONDS = 60
/** How long the newest build stays on screen at the end of the video. */
const FINAL_HOLD_SECONDS = 2
/**
 * Longer pauses between builds (overnight, a weekend) play back as if they
 * were this long, so time away from the project does not swamp the video.
 */
export const MAX_IDLE_GAP_MS = 15 * 60 * 1000

export interface RoutingHistoryFrame {
  /** Index of the newest build that existed at this point in time. */
  buildIndex: number
  /** Playhead position along the timeline, from 0 to 1. */
  progress: number
  /** The point in real time this frame shows. */
  timeMs: number
}

export interface RoutingHistoryTimeline {
  frames: RoutingHistoryFrame[]
  /** Timeline position of each build, from 0 to 1. */
  buildProgress: number[]
  /** Whether the pause after each build was shortened to MAX_IDLE_GAP_MS. */
  isGapCompressed: boolean[]
  /** Seconds of (compressed) real time per second of video. */
  speedup: number
}

/**
 * Lays out video frames so playback time is proportional to the real time
 * between builds: the playhead moves at a constant rate and every frame shows
 * the newest build that existed at that moment. Every build gets at least one
 * frame.
 */
export const getRoutingHistoryTimeline = ({
  buildTimesMs,
  fps,
}: {
  /** When each build was created, oldest first. */
  buildTimesMs: number[]
  fps: number
}): RoutingHistoryTimeline => {
  const lastIndex = buildTimesMs.length - 1
  const realGaps = buildTimesMs
    .slice(1)
    .map((timeMs, index) => Math.max(0, timeMs - buildTimesMs[index]!))
  const gaps = realGaps.map((gap) => Math.min(gap, MAX_IDLE_GAP_MS))
  const totalGapMs = gaps.reduce((sum, gap) => sum + gap, 0)

  const playbackSeconds =
    totalGapMs > 0
      ? Math.min(
          MAX_PLAYBACK_SECONDS,
          Math.max(MIN_PLAYBACK_SECONDS, totalGapMs / 1000 / DEFAULT_SPEEDUP),
        )
      : 0

  const buildProgress: number[] = []
  let elapsedGapMs = 0
  for (let index = 0; index <= lastIndex; index++) {
    buildProgress.push(totalGapMs > 0 ? elapsedGapMs / totalGapMs : 1)
    elapsedGapMs += gaps[index] ?? 0
  }

  const frames: RoutingHistoryFrame[] = []
  for (let index = 0; index < lastIndex; index++) {
    const frameCount =
      totalGapMs > 0
        ? Math.max(
            1,
            Math.round((gaps[index]! / totalGapMs) * playbackSeconds * fps),
          )
        : 1
    for (let frame = 0; frame < frameCount; frame++) {
      const gapProgress = frame / frameCount
      frames.push({
        buildIndex: index,
        progress:
          buildProgress[index]! +
          (buildProgress[index + 1]! - buildProgress[index]!) * gapProgress,
        timeMs: buildTimesMs[index]! + realGaps[index]! * gapProgress,
      })
    }
  }

  if (lastIndex >= 0) {
    const holdFrames = Math.max(1, Math.round(FINAL_HOLD_SECONDS * fps))
    for (let frame = 0; frame < holdFrames; frame++) {
      frames.push({
        buildIndex: lastIndex,
        progress: 1,
        timeMs: buildTimesMs[lastIndex]!,
      })
    }
  }

  return {
    frames,
    buildProgress,
    isGapCompressed: realGaps.map((gap) => gap > MAX_IDLE_GAP_MS),
    speedup: playbackSeconds > 0 ? totalGapMs / 1000 / playbackSeconds : 1,
  }
}
