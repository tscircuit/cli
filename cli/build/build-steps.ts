import fs from "node:fs"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { circuitJsonToStep } from "circuit-json-to-step"
import type { BuildFileResult } from "./build-preview-images"
import { convertModelUrlsToFileUrls } from "./convert-model-urls-to-file-urls"

const viewToArrayBuffer = (view: ArrayBufferView): ArrayBuffer => {
  const copy = new Uint8Array(view.byteLength)
  copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))
  return copy.buffer
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
    "Expected Uint8Array, ArrayBuffer, or ArrayBufferView for GLB",
  )
}

export const buildSteps = async ({
  builtFiles,
  distDir,
}: {
  builtFiles: BuildFileResult[]
  distDir: string
}) => {
  const successfulBuilds = builtFiles.filter((file) => file.ok)

  if (successfulBuilds.length === 0) {
    console.warn("No successful build output available for STEP generation.")
    return
  }

  for (const build of successfulBuilds) {
    const outputDir = path.dirname(build.outputPath)
    const prefixRelative = path.relative(distDir, outputDir) || "."
    const prefix = prefixRelative === "." ? "" : `[${prefixRelative}] `

    let circuitJson: AnyCircuitElement[]
    try {
      const circuitJsonRaw = fs.readFileSync(build.outputPath, "utf-8")
      circuitJson = JSON.parse(circuitJsonRaw)
    } catch (error) {
      console.error(`${prefix}Failed to read circuit JSON:`, error)
      continue
    }

    try {
      console.log(`${prefix}Converting circuit to STEP...`)
      const circuitJsonWithFileUrls = convertModelUrlsToFileUrls(circuitJson)
      const stepString = await circuitJsonToStep(circuitJsonWithFileUrls)
      fs.writeFileSync(path.join(outputDir, "3d.step"), stepString)
      console.log(`${prefix}Written 3d.step`)
    } catch (error) {
      console.error(`${prefix}Failed to generate GLB:`, error)
    }
  }
}
