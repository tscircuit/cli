import fs from "node:fs"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import { getCircuitJsonToGltfOptions } from "lib/shared/get-circuit-json-to-gltf-options"
import type { BuildFileResult } from "./build-preview-images"
import { convertModelUrlsToFileUrls } from "./convert-model-urls-to-file-urls"
import { buildGlbsWithWorkerPool } from "./worker-pool"

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

export const buildGlbs = async ({
  builtFiles,
  distDir,
  projectDir,
  concurrency,
}: {
  builtFiles: BuildFileResult[]
  distDir: string
  projectDir: string
  concurrency: number
}) => {
  const successfulBuilds = builtFiles.filter((file) => file.ok)

  if (successfulBuilds.length === 0) {
    console.warn("No successful build output available for GLB generation.")
    return
  }

  if (concurrency > 1) {
    const filesToConvert = successfulBuilds.map((build) => {
      const outputDir = path.dirname(build.outputPath)
      return {
        circuitJsonPath: build.outputPath,
        glbOutputPath: path.join(outputDir, "3d.glb"),
      }
    })

    await buildGlbsWithWorkerPool({
      files: filesToConvert,
      projectDir,
      concurrency,
      onLog: (lines) => {
        for (const line of lines) {
          console.log(line)
        }
      },
      onJobComplete: async (result) => {
        const outputDir = path.dirname(result.circuitJsonPath)
        const prefixRelative = path.relative(distDir, outputDir) || "."
        const prefix = prefixRelative === "." ? "" : `[${prefixRelative}] `

        if (result.ok) {
          console.log(`${prefix}Written 3d.glb`)
        } else {
          console.error(
            `${prefix}Failed to generate GLB:${result.error ? ` ${result.error}` : ""}`,
          )
        }
      },
    })

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
      console.log(`${prefix}Converting circuit to GLB...`)
      const circuitJsonWithFileUrls = convertModelUrlsToFileUrls(circuitJson)
      const glbBuffer = await convertCircuitJsonToGltf(
        circuitJsonWithFileUrls,
        getCircuitJsonToGltfOptions({ format: "glb" }),
      )
      const glbData = normalizeToUint8Array(glbBuffer)
      fs.writeFileSync(path.join(outputDir, "3d.glb"), Buffer.from(glbData))
      console.log(`${prefix}Written 3d.glb`)
    } catch (error) {
      console.error(`${prefix}Failed to generate GLB:`, error)
    }
  }
}
