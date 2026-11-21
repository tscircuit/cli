import { expect, test } from "bun:test"
import { execFile } from "node:child_process"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import type { AnyCircuitElement } from "circuit-json"
import { renderRoutingHistoryVideo } from "lib/shared/render-routing-history-video"
import { temporaryDirectory } from "tempy"

const run = promisify(execFile)

/** A board with two pads and one trace per entry in `traceYs`. */
const getCircuitJson = (traceYs: number[]): AnyCircuitElement[] => [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 24,
    height: 12,
    thickness: 1.4,
    num_layers: 2,
    material: "fr4",
  },
  ...traceYs.flatMap((y, index): AnyCircuitElement[] => [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: `pcb_smtpad_${index}_a`,
      shape: "rect",
      x: -8,
      y,
      width: 1.2,
      height: 1.2,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: `pcb_smtpad_${index}_b`,
      shape: "rect",
      x: 8,
      y: -y,
      width: 1.2,
      height: 1.2,
      layer: "top",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: `pcb_trace_${index}`,
      route: [
        { route_type: "wire", x: -8, y, width: 0.3, layer: "top" },
        { route_type: "wire", x: 0, y, width: 0.3, layer: "top" },
        { route_type: "wire", x: 8, y: -y, width: 0.3, layer: "top" },
      ],
    },
  ]),
]

test("routing history video shows each build above a time-proportional timeline", async () => {
  const tmpDir = temporaryDirectory()
  const startMs = Date.UTC(2026, 0, 15, 9, 30, 0)
  // Builds after 1 and 3 minutes, then one after a 3 hour break.
  const builds = [
    { offsetMinutes: 0, traceYs: [] },
    { offsetMinutes: 1, traceYs: [4] },
    { offsetMinutes: 3, traceYs: [4, 2] },
    { offsetMinutes: 183, traceYs: [4, 2, 0] },
  ]
  const history = await Promise.all(
    builds.map(async (build, index) => {
      const circuitJsonPath = path.join(tmpDir, `build-${index}.circuit.json`)
      await writeFile(
        circuitJsonPath,
        JSON.stringify(getCircuitJson(build.traceYs)),
      )
      return {
        createdAt: new Date(startMs + build.offsetMinutes * 60_000),
        circuitJsonPath,
      }
    }),
  )

  // The timeline shows local time, so pin the timezone for a stable snapshot.
  const originalTimeZone = process.env.TZ
  process.env.TZ = "UTC"
  const videoPath = path.join(tmpDir, "routing-history.mp4")
  try {
    await writeFile(videoPath, await renderRoutingHistoryVideo(history))
  } finally {
    if (originalTimeZone === undefined) delete process.env.TZ
    else process.env.TZ = originalTimeZone
  }

  // 3 real minutes plus the break capped at 15 minutes, at 60x and 24fps:
  // 24 + 48 + 360 frames, then a 48 frame hold on the newest build.
  const storyboardPath = path.join(tmpDir, "storyboard.png")
  await run("ffmpeg", [
    "-v",
    "error",
    "-i",
    videoPath,
    "-sws_flags",
    "+accurate_rnd+bitexact",
    "-vf",
    "select='eq(n,0)+eq(n,36)+eq(n,252)+eq(n,479)',tile=2x2",
    "-frames:v",
    "1",
    storyboardPath,
  ])
  await expect(await readFile(storyboardPath)).toMatchPngSnapshot(
    import.meta.path,
  )
}, 60_000)
