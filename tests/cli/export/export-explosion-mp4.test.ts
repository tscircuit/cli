import { expect, test } from "bun:test"
import { execFile } from "node:child_process"
import {
  copyFile,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { loadRp2040ExplosionFixture } from "../../fixtures/explosion/load-fixture"

const run = promisify(execFile)
const matchVideoStoryboard = async (storyboard: string, name: string) => {
  const actualPath = path.join(
    import.meta.dir,
    `__snapshots__/export-explosion-mp4-${name}.actual.png`,
  )
  try {
    await expect(await readFile(storyboard)).toMatchPngSnapshot(
      import.meta.path,
      name,
    )
    await rm(actualPath, { force: true })
  } catch (error) {
    // Preserve decoded output so codec/platform differences are diagnosable.
    await copyFile(storyboard, actualPath)
    throw error
  }
}
const probe = async (file: string) =>
  JSON.parse(
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
        file,
      ])
    ).stdout,
  ).streams[0]

test("export the real RP2040/NEMA17 explosion as a playable stage-by-stage MP4", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const input = path.join(tmpDir, "rp2040.circuit.json")
  const output = path.join(tmpDir, "rp2040-explosion.mp4")
  const circuitJson = await loadRp2040ExplosionFixture()
  expect(
    circuitJson.filter((e) => e.type === "cad_explosion_stage"),
  ).toHaveLength(4)
  expect(circuitJson.filter((e) => e.type === "cad_component")).toHaveLength(
    117,
  )
  await writeFile(input, JSON.stringify(circuitJson))
  const result = await runCommand(
    `tsci export ${input} -f explosion-mp4 -o ${output} --fps 12 --width 480 --height 600 --stage-duration 1 --hold-duration 0.5`,
  )
  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe("")
  expect(result.stdout).toContain(`Exported to ${output}!`)

  const stream = await probe(output)
  expect(stream.codec_name).toBe("h264")
  expect(stream.pix_fmt).toBe("yuv420p")
  expect([stream.width, stream.height]).toEqual([480, 600])
  expect(stream.avg_frame_rate).toBe("12/1")
  // Six assembled frames, then four stages with 12 moving + six held frames.
  expect(Number(stream.nb_read_frames)).toBe(78)
  expect(Number(stream.duration)).toBeCloseTo(6.5, 3)
  await run("ffmpeg", ["-v", "error", "-i", output, "-f", "null", "-"])

  // Assert decoded pixels, not MP4 byte identity (encoder metadata can vary).
  // Include a half-lift pose to catch a slideshow masquerading as animation.
  const storyboard = path.join(tmpDir, "stages.png")
  await run("ffmpeg", [
    "-v",
    "error",
    "-i",
    output,
    "-sws_flags",
    "+accurate_rnd+bitexact",
    "-vf",
    "select='eq(n,0)+eq(n,11)+eq(n,17)+eq(n,35)+eq(n,53)+eq(n,71)',tile=3x2",
    "-frames:v",
    "1",
    storyboard,
  ])
  await matchVideoStoryboard(storyboard, "stages")
  const artifact = path.join(
    import.meta.dir,
    "__snapshots__/rp2040-explosion.mp4",
  )
  if (
    process.env.BUN_UPDATE_SNAPSHOTS ||
    process.argv.includes("-u") ||
    process.argv.includes("--update-snapshots")
  ) {
    await copyFile(output, artifact)
  }
  // The reviewable video is deliberately tracked alongside its PNG storyboard.
  expect(await Bun.file(artifact).exists()).toBe(true)
  const committed = await probe(artifact)
  expect(Number(committed.nb_read_frames)).toBe(78)
  const committedStoryboard = path.join(tmpDir, "committed-stages.png")
  await run("ffmpeg", [
    "-v",
    "error",
    "-i",
    artifact,
    "-sws_flags",
    "+accurate_rnd+bitexact",
    "-vf",
    "select='eq(n,0)+eq(n,11)+eq(n,17)+eq(n,35)+eq(n,53)+eq(n,71)',tile=3x2",
    "-frames:v",
    "1",
    committedStoryboard,
  ])
  await expect(await readFile(committedStoryboard)).toMatchPngSnapshot(
    import.meta.path,
    "stages",
  )
}, 180_000)

test("export TSX with real NEMA17/M3 meshes and sequential out-and-back moves", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const json = await loadRp2040ExplosionFixture()
  const getCad = (name: string) => {
    const source = json.find(
      (e) => e.type === "source_component" && e.name === name,
    )!
    return json.find(
      (e) =>
        e.type === "cad_component" &&
        "source_component_id" in source &&
        e.source_component_id === source.source_component_id,
    )!
  }
  const motor = getCad("motor")
  const bolt = getCad("bolt1")
  if (motor.type !== "cad_component" || bolt.type !== "cad_component")
    throw new Error("Missing real models")
  await mkdir(path.join(tmpDir, "node_modules"))
  for (const dependency of ["react", "tscircuit"]) {
    await symlink(
      path.resolve(import.meta.dir, "../../../node_modules", dependency),
      path.join(tmpDir, "node_modules", dependency),
      "dir",
    )
  }
  const input = path.join(tmpDir, "motor.tsx")
  await writeFile(
    input,
    `
import { assembly } from "tscircuit"
export default () => (
  <assembly.device name="MOTOR">
    <assembly.part name="motor" cadModel={{ glbUrl: ${JSON.stringify(motor.model_glb_url)}, modelBoardNormalDirection: "z+" }} />
    <assembly.part name="bolt" cadModel={{ objUrl: ${JSON.stringify(bolt.model_obj_url)}, modelBoardNormalDirection: "z+", positionOffset: { x: 15.5, y: 15.5, z: 40 } }} />
    <assembly.explosion.stage name="remove-and-return">
      <assembly.explosion.move targetRef="bolt" offZ={60} />
      <assembly.explosion.move targetRef="bolt" offZ={-60} />
    </assembly.explosion.stage>
  </assembly.device>
)`,
  )
  const { exitCode, stderr } = await runCommand(
    `tsci export ${input} -f explosion-mp4 --fps 2 --width 240 --height 320 --stage-duration 1 --hold-duration 0`,
  )
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  const output = path.join(tmpDir, "motor-explosion.mp4")
  expect(Number((await probe(output)).nb_read_frames)).toBe(3)
  const storyboard = path.join(tmpDir, "motor-stages.png")
  await run("ffmpeg", [
    "-v",
    "error",
    "-i",
    output,
    "-sws_flags",
    "+accurate_rnd+bitexact",
    "-vf",
    "tile=3x1",
    "-frames:v",
    "1",
    storyboard,
  ])
  await matchVideoStoryboard(storyboard, "tsx-out-and-back")
}, 60_000)

test("reject video options on other formats and invalid dimensions before compiling", async () => {
  const { runCommand } = await getCliTestFixture({
    env: { GITHUB_ACTIONS: "true" },
  })
  const diagnostics = []
  for (const [args, message] of [
    ["-f glb --fps 12", "Video options require --format explosion-mp4"],
    ["-f explosion-mp4 --width 481", "--width must be an even integer"],
    ["-f explosion-mp4 --fps NaN", "--fps must be an integer"],
    ["-f explosion-mp4 --stage-duration 0", "--stage-duration must be greater"],
    ["-f explosion-mp4 --hold-duration -1", "--hold-duration must be between"],
  ]) {
    const result = await runCommand(`tsci export missing.tsx ${args}`)
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain(message)
    expect(result.stderr).not.toContain("::error ")
    diagnostics.push({
      args,
      exitCode: result.exitCode,
      error: result.stderr
        .split("\n")
        .find((line) => line.startsWith("error: ")),
    })
  }
  expect(diagnostics).toMatchInlineSnapshot(`
    [
      {
        "args": "-f glb --fps 12",
        "error": "error: Video options require --format explosion-mp4",
        "exitCode": 1,
      },
      {
        "args": "-f explosion-mp4 --width 481",
        "error": "error: --width must be an even integer from 128 to 3840",
        "exitCode": 1,
      },
      {
        "args": "-f explosion-mp4 --fps NaN",
        "error": "error: --fps must be an integer from 1 to 60",
        "exitCode": 1,
      },
      {
        "args": "-f explosion-mp4 --stage-duration 0",
        "error": "error: --stage-duration must be greater than 0 and at most 60 seconds",
        "exitCode": 1,
      },
      {
        "args": "-f explosion-mp4 --hold-duration -1",
        "error": "error: --hold-duration must be between 0 and 60 seconds",
        "exitCode": 1,
      },
    ]
  `)
})

test("a circuit without an explosion reports an actionable error and writes no video", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const input = path.join(tmpDir, "empty.circuit.json")
  await writeFile(input, "[]")
  const result = await runCommand(`tsci export ${input} -f explosion-mp4`)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("No explosion stages found")
  expect(
    await Bun.file(path.join(tmpDir, "empty.circuit-explosion.mp4")).exists(),
  ).toBe(false)
})

test("missing FFmpeg reports an actionable error without writing a partial MP4", async () => {
  const env = { PATH: "" }
  const { tmpDir, runCommand } = await getCliTestFixture({ env })
  env.PATH = tmpDir
  await symlink(process.execPath, path.join(tmpDir, "bun"))
  const input = path.join(tmpDir, "assembly.circuit.json")
  await writeFile(input, JSON.stringify(await loadRp2040ExplosionFixture()))
  const result = await runCommand(`tsci export ${input} -f explosion-mp4`)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("Explosion MP4 export requires FFmpeg")
  expect(
    await Bun.file(
      path.join(tmpDir, "assembly.circuit-explosion.mp4"),
    ).exists(),
  ).toBe(false)
})
