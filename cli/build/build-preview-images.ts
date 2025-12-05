import fs from "node:fs"
import path from "node:path"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { renderGLTFToPNGBufferFromGLBBuffer } from "poppygl"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import type { AnyCircuitElement } from "circuit-json"
import { calculateCameraPosition } from "lib/shared/calculate-camera-position"

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

  try {
    const circuitJsonRaw = fs.readFileSync(build.outputPath, "utf-8")
    const circuitJson = JSON.parse(circuitJsonRaw) as AnyCircuitElement[]

    console.log(`${prefix}Generating PCB SVG...`)
    const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson)
    console.log(`${prefix}Generating schematic SVG...`)
    const schematicSvg = convertCircuitJsonToSchematicSvg(circuitJson)
    console.log(`${prefix}Converting circuit to GLB...`)
    const glbBuffer = await convertCircuitJsonToGltf(circuitJson, {
      format: "glb",
    })
    console.log(`${prefix}Rendering GLB to PNG buffer...`)
    const glbArrayBuffer = await normalizeToArrayBuffer(glbBuffer)
    const cameraSettings = calculateCameraPosition(circuitJson)
    const pngBuffer = await renderGLTFToPNGBufferFromGLBBuffer(glbArrayBuffer, {
      camPos: cameraSettings.camPos,
      lookAt: cameraSettings.lookAt,
    })

    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(path.join(outputDir, "pcb.svg"), pcbSvg, "utf-8")
    console.log(`${prefix}Written pcb.svg`)
    fs.writeFileSync(
      path.join(outputDir, "schematic.svg"),
      schematicSvg,
      "utf-8",
    )
    console.log(`${prefix}Written schematic.svg`)
    fs.writeFileSync(
      path.join(outputDir, "3d.png"),
      Buffer.from(normalizeToUint8Array(pngBuffer)),
    )
    console.log(`${prefix}Written 3d.png`)
  } catch (error) {
    console.error(`${prefix}Failed to generate preview images:`, error)
  }
}

export const buildPreviewImages = async ({
  builtFiles,
  distDir,
  mainEntrypoint,
  allImages,
}: {
  builtFiles: BuildFileResult[]
  distDir: string
  mainEntrypoint?: string
  allImages?: boolean
}) => {
  const successfulBuilds = builtFiles.filter((file) => file.ok)
  const normalizedMainEntrypoint = mainEntrypoint
    ? path.resolve(mainEntrypoint)
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
    if (normalizedMainEntrypoint) {
      const match = successfulBuilds.find(
        (built) => path.resolve(built.sourcePath) === normalizedMainEntrypoint,
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
