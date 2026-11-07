import { execFile, spawn } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { promisify } from "node:util"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToGltf,
  getAssemblyExplosionFrames,
  type AssemblyExplosionOptions,
} from "circuit-json-to-gltf"
import {
  computeWorldAABB,
  createSceneFromGLTF,
  loadGLTFWithResourcesFromURL,
  renderSceneFromGLTF,
} from "poppygl"
import { convertModelUrlsToFileUrls } from "../../cli/build/convert-model-urls-to-file-urls"
import { getCircuitJsonToGltfOptions } from "./get-circuit-json-to-gltf-options"
import {
  resolveExplosionVideoOptions,
  type ExplosionVideoOptions,
} from "./explosion-video-options"
import { getExplosionVideoCamera } from "./explosion-video-camera"
import {
  createExplosionVideoCaption,
  EXPLOSION_CAPTION_HEIGHT,
} from "./explosion-video-caption"

/** Render authored Circuit JSON translations through the normal glTF exporter.
 * PoppyGL reads guide lines from glTF extras; no separate movement/line renderer.
 * Only one scene and one RGBA frame are retained while encoding the video.
 */
export async function renderExplosionVideo(
  circuitJson: AnyCircuitElement[],
  input: Partial<ExplosionVideoOptions> = {},
): Promise<Buffer> {
  const options = resolveExplosionVideoOptions(input)
  const stages = getAssemblyExplosionFrames(circuitJson)
    .slice(1)
    .map(({ name, explosion }) => ({ name, explosion }))
  if (!stages.length)
    throw new Error(
      "No explosion stages found. Add <assembly.explosion.stage> and <assembly.explosion.move> before exporting a video.",
    )
  try {
    await promisify(execFile)("ffmpeg", ["-version"])
  } catch {
    throw new Error(
      "Explosion MP4 export requires FFmpeg. Install ffmpeg and make sure it is on PATH.",
    )
  }
  const geometry = convertModelUrlsToFileUrls(
    circuitJson,
  ) as AnyCircuitElement[]
  const loadScene = async (explosion?: AssemblyExplosionOptions) => {
    const glb = await convertCircuitJsonToGltf(geometry, {
      ...getCircuitJsonToGltfOptions({ format: "glb" }),
      explosion,
      boardTextureResolution: 512,
      includeModels: true,
      showBoundingBoxes: false,
    })
    const { gltf, resources } = await loadGLTFWithResourcesFromURL(
      `data:model/gltf-binary;base64,${Buffer.from(glb as ArrayBuffer).toString("base64")}`,
    )
    return createSceneFromGLTF(gltf, resources)
  }
  // Include every move endpoint, not just stage endpoints: a stage can move
  // outward and then return. Fit actual mesh bounds in the exported +Y-up frame.
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  }
  const includePose = async (explosion?: AssemblyExplosionOptions) => {
    const scene = await loadScene(explosion)
    if (!scene.drawCalls.length)
      throw new Error("No renderable geometry found for the explosion video")
    const box = computeWorldAABB(scene.drawCalls)
    for (let axis = 0; axis < 3; axis++) {
      bounds.min[axis] = Math.min(bounds.min[axis], box.min[axis])
      bounds.max[axis] = Math.max(bounds.max[axis], box.max[axis])
    }
  }
  await includePose()
  for (const stage of stages) {
    const record = circuitJson.find(
      (e) => e.type === "cad_explosion_stage" && e.name === stage.name,
    )
    if (record?.type !== "cad_explosion_stage")
      throw new Error(`Missing explosion stage: ${stage.name}`)
    const count = circuitJson.filter(
      (e) =>
        e.type === "cad_explosion_move" &&
        e.cad_explosion_stage_id === record.cad_explosion_stage_id,
    ).length
    for (let move = 1; move <= Math.max(count, 1); move++) {
      await includePose({
        ...stage.explosion,
        stageProgress: move / Math.max(count, 1),
      })
    }
  }
  if (![...bounds.min, ...bounds.max].every(Number.isFinite))
    throw new Error("No renderable geometry found for the explosion video")
  const renderHeight = options.height - EXPLOSION_CAPTION_HEIGHT
  const camera = getExplosionVideoCamera(bounds, options.width / renderHeight)
  const holdFrames = Math.round(options.holdDuration * options.fps)
  const moveFrames = Math.max(
    1,
    Math.round(options.stageDuration * options.fps),
  )
  const render = async (
    explosion: AssemblyExplosionOptions | undefined,
    label: string,
  ) => {
    const { bitmap } = renderSceneFromGLTF(await loadScene(explosion), {
      ...camera,
      width: options.width,
      height: renderHeight,
      supersampling: 1,
      backgroundColor: "#ffffff",
      grid: false,
    })
    return Buffer.concat([
      createExplosionVideoCaption(label, options.width),
      Buffer.from(bitmap.data),
    ])
  }
  async function* rgbaFrames() {
    const assembled = await render(undefined, `0/${stages.length} Assembled`)
    for (let i = 0; i < Math.max(holdFrames, 1); i++) yield assembled
    for (const [index, stage] of stages.entries()) {
      const label = `${index + 1}/${stages.length} ${stage.name}`
      let rgba!: Buffer
      for (let frame = 1; frame <= moveFrames; frame++) {
        rgba = await render(
          { ...stage.explosion, stageProgress: frame / moveFrames },
          label,
        )
        yield rgba
      }
      for (let i = 0; i < holdFrames; i++) yield rgba
    }
  }
  const directory = await mkdtemp(path.join(tmpdir(), "tsci-explosion-"))
  const output = path.join(directory, "explosion.mp4")
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
      `${options.width}x${options.height}`,
      "-framerate",
      String(options.fps),
      "-i",
      "pipe:0",
      "-an",
      "-c:v",
      "libx264",
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
      pipeline(Readable.from(rgbaFrames()), encoder.stdin),
      completed,
    ])
    return await readFile(output)
  } catch (error) {
    encoder.kill()
    await completed.catch(() => {})
    throw new Error(
      `Could not encode explosion video: ${stderr.trim() || String(error)}`,
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
