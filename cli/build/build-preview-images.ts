import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { renderGLTFToPNGBufferFromGLBBuffer } from "poppygl"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import type { AnyCircuitElement } from "circuit-json"

export interface BuildFileResult {
  sourcePath: string
  outputPath: string
  ok: boolean
}

const viewToArrayBuffer = (view: ArrayBufferView): ArrayBuffer => {
  const copy = new Uint8Array(view.byteLength)
  copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))
  return copy.buffer
}

const normalizeToArrayBuffer = async (value: unknown): Promise<ArrayBuffer> => {
  if (value instanceof ArrayBuffer) {
    return value
  }

  if (ArrayBuffer.isView(value)) {
    return viewToArrayBuffer(value as ArrayBufferView)
  }

  if (value && typeof value === "object") {
    const maybeArrayBufferLike = value as {
      arrayBuffer?: () => Promise<ArrayBuffer> | ArrayBuffer
    }
    if (typeof maybeArrayBufferLike.arrayBuffer === "function") {
      const result = maybeArrayBufferLike.arrayBuffer()
      return result instanceof Promise ? await result : result
    }
  }

  throw new Error(
    "Expected ArrayBuffer, ArrayBufferView, or Buffer-compatible object",
  )
}

const normalizeToUint8Array = (value: unknown): Uint8Array => {
  if (value instanceof Uint8Array) {
    return value
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value)
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(viewToArrayBuffer(value as ArrayBufferView))
  }

  throw new Error(
    "Expected Uint8Array, ArrayBuffer, or ArrayBufferView for PNG",
  )
}

/**
 * Convert local file paths in model URLs to file:// URLs for fetch() compatibility.
 * The circuit-json-to-gltf library uses fetch() to load GLB/STL/OBJ/GLTF files,
 * which requires proper URLs rather than local file paths.
 */
const convertModelUrlsToFileUrls = (circuitJson: any[]): any[] => {
  const modelUrlKeys = [
    "model_glb_url",
    "glb_model_url",
    "model_stl_url",
    "stl_model_url",
    "model_obj_url",
    "obj_model_url",
    "model_gltf_url",
    "gltf_model_url",
  ]

  return circuitJson.map((element) => {
    if (!element || typeof element !== "object") return element

    const updated = { ...element }
    for (const key of modelUrlKeys) {
      const value = updated[key]
      if (typeof value === "string" && value.length > 0) {
        console.log("value", value)
        // Check if it's a local file path (starts with / or drive letter on Windows)
        // and not already a URL (http://, https://, file://, etc.)
        if (
          !value.match(/^[a-zA-Z]+:\/\//) &&
          (value.startsWith("/") || value.match(/^[a-zA-Z]:\\/))
        ) {
          updated[key] = pathToFileURL(value).href
        }
      }
    }
    return updated
  })
}

const generatePreviewAssets = async ({
  build,
  outputDir,
  distDir,
}: {
  build: BuildFileResult
  outputDir: string
  distDir: string
}) => {
  const prefixRelative = path.relative(distDir, outputDir) || "."
  const prefix = prefixRelative === "." ? "" : `[${prefixRelative}] `

  let circuitJson: AnyCircuitElement[]
  try {
    const circuitJsonRaw = fs.readFileSync(build.outputPath, "utf-8")
    circuitJson = JSON.parse(circuitJsonRaw)
  } catch (error) {
    console.error(`${prefix}Failed to read circuit JSON:`, error)
    return
  }

  fs.mkdirSync(outputDir, { recursive: true })

  // Generate PCB SVG
  try {
    console.log(`${prefix}Generating PCB SVG...`)
    const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson)
    fs.writeFileSync(path.join(outputDir, "pcb.svg"), pcbSvg, "utf-8")
    console.log(`${prefix}Written pcb.svg`)
  } catch (error) {
    console.error(`${prefix}Failed to generate PCB SVG:`, error)
  }

  // Generate schematic SVG
  try {
    console.log(`${prefix}Generating schematic SVG...`)
    const schematicSvg = convertCircuitJsonToSchematicSvg(circuitJson)
    fs.writeFileSync(
      path.join(outputDir, "schematic.svg"),
      schematicSvg,
      "utf-8",
    )
    console.log(`${prefix}Written schematic.svg`)
  } catch (error) {
    console.error(`${prefix}Failed to generate schematic SVG:`, error)
  }

  // Generate 3D PNG
  try {
    console.log(`${prefix}Converting circuit to GLB...`)
    const circuitJsonWithFileUrls = convertModelUrlsToFileUrls(circuitJson)
    const glbBuffer = await convertCircuitJsonToGltf(circuitJsonWithFileUrls, {
      format: "glb",
    })
    console.log(`${prefix}Rendering GLB to PNG buffer...`)
    const glbArrayBuffer = await normalizeToArrayBuffer(glbBuffer)
    const pngBuffer = await renderGLTFToPNGBufferFromGLBBuffer(glbArrayBuffer, {
      camPos: [10, 10, 10],
      lookAt: [0, 0, 0],
    })
    fs.writeFileSync(
      path.join(outputDir, "3d.png"),
      Buffer.from(normalizeToUint8Array(pngBuffer)),
    )
    console.log(`${prefix}Written 3d.png`)
  } catch (error) {
    console.error(`${prefix}Failed to generate 3D PNG:`, error)
  }
}

export const buildPreviewImages = async ({
  builtFiles,
  distDir,
  mainEntrypoint,
  previewComponentPath,
  allImages,
}: {
  builtFiles: BuildFileResult[]
  distDir: string
  mainEntrypoint?: string
  previewComponentPath?: string
  allImages?: boolean
}) => {
  const successfulBuilds = builtFiles.filter((file) => file.ok)
  // previewComponentPath takes precedence over mainEntrypoint for preview images
  const previewEntrypoint = previewComponentPath || mainEntrypoint
  const resolvedPreviewEntrypoint = previewEntrypoint
    ? path.resolve(previewEntrypoint)
    : undefined

  if (allImages) {
    if (successfulBuilds.length === 0) {
      console.warn(
        "No successful build output available for preview image generation.",
      )
      return
    }

    for (const build of successfulBuilds) {
      const outputDir = path.dirname(build.outputPath)
      await generatePreviewAssets({
        build,
        outputDir,
        distDir,
      })
    }
    return
  }

  const previewBuild = (() => {
    if (resolvedPreviewEntrypoint) {
      const match = successfulBuilds.find(
        (built) => path.resolve(built.sourcePath) === resolvedPreviewEntrypoint,
      )
      if (match) return match
    }
    return successfulBuilds[0]
  })()

  if (!previewBuild) {
    console.warn(
      "No successful build output available for preview image generation.",
    )
    return
  }

  await generatePreviewAssets({
    build: previewBuild,
    outputDir: distDir,
    distDir,
  })
}
