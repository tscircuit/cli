import { expect, test } from "bun:test"
import {
  MAX_IDLE_GAP_MS,
  getRoutingHistoryTimeline,
} from "lib/shared/routing-history-timeline"

const MINUTE = 60_000

const countFramesByBuild = (
  frames: ReturnType<typeof getRoutingHistoryTimeline>["frames"],
) => {
  const counts: number[] = []
  for (const frame of frames) {
    counts[frame.buildIndex] = (counts[frame.buildIndex] ?? 0) + 1
  }
  return counts
}

test("routing history playback time is proportional to time between builds", () => {
  const timeline = getRoutingHistoryTimeline({
    buildTimesMs: [0, 1 * MINUTE, 4 * MINUTE, 10 * MINUTE],
    fps: 24,
  })

  // Ten minutes at one real minute per video second, plus a two second hold.
  expect(timeline.speedup).toBe(60)
  expect(countFramesByBuild(timeline.frames)).toEqual([24, 72, 144, 48])
  expect(timeline.buildProgress).toEqual([0, 0.1, 0.4, 1])
  expect(timeline.isGapCompressed).toEqual([false, false, false])

  // Halfway through the second build's lifetime.
  expect(timeline.frames[24 + 36]).toEqual({
    buildIndex: 1,
    progress: 0.25,
    timeMs: 2.5 * MINUTE,
  })
  expect(timeline.frames.at(-1)).toEqual({
    buildIndex: 3,
    progress: 1,
    timeMs: 10 * MINUTE,
  })
})

test("routing history compresses long idle gaps and never drops a build", () => {
  const timeline = getRoutingHistoryTimeline({
    buildTimesMs: [0, 5 * MINUTE, 24 * 60 * MINUTE, 24 * 60 * MINUTE + 100],
    fps: 24,
  })

  expect(timeline.isGapCompressed).toEqual([false, true, false])
  // The overnight gap plays back as MAX_IDLE_GAP_MS rather than ~24 hours.
  const compressedSpanMs = 5 * MINUTE + MAX_IDLE_GAP_MS + 100
  expect(timeline.buildProgress[2]).toBeCloseTo(
    (5 * MINUTE + MAX_IDLE_GAP_MS) / compressedSpanMs,
  )
  // A build replaced after 100ms is still visible for one frame.
  expect(countFramesByBuild(timeline.frames)[2]).toBe(1)
})

test("routing history with a single build holds on that build", () => {
  const timeline = getRoutingHistoryTimeline({ buildTimesMs: [1000], fps: 24 })

  expect(timeline.frames).toHaveLength(48)
  expect(timeline.frames[0]).toEqual({
    buildIndex: 0,
    progress: 1,
    timeMs: 1000,
  })
})
