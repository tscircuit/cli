import fs from "node:fs"
import path from "node:path"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import type { AnyCircuitElement } from "circuit-json"
import type { BuildFileResult } from "./build-preview-images"
import { convertModelUrlsToFileUrls } from "./convert-model-urls-to-file-urls"

export const buildPreviewGltf = async ({
  builtFiles,
  distDir,
  mainEntrypoint,
  previewComponentPath,
}: {
  builtFiles: BuildFileResult[]
  distDir: string
  mainEntrypoint?: string
  previewComponentPath?: string
}) => {
  const successfulBuilds = builtFiles.filter((file) => file.ok)

  // previewComponentPath takes precedence over mainEntrypoint
  const previewEntrypoint = previewComponentPath || mainEntrypoint
  const resolvedPreviewEntrypoint = previewEntrypoint
    ? path.resolve(previewEntrypoint)
    : undefined

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
      "No successful build output available for preview GLTF generation.",
    )
    return
  }

  let circuitJson: AnyCircuitElement[]
  try {
    const circuitJsonRaw = fs.readFileSync(previewBuild.outputPath, "utf-8")
    circuitJson = JSON.parse(circuitJsonRaw)
  } catch (error) {
    console.error("Failed to read circuit JSON:", error)
    return
  }

  // Derive output filename from the source path
  const sourcePath = previewBuild.sourcePath
  const sourceBasename = path.basename(sourcePath)
  const gltfFilename = sourceBasename.replace(
    /\.(board|circuit)?\.tsx?$/,
    ".gltf",
  )
  const outputPath = path.join(distDir, gltfFilename)

  try {
    console.log("Converting circuit to GLTF...")
    const circuitJsonWithFileUrls = convertModelUrlsToFileUrls(circuitJson)
    const gltfData = await convertCircuitJsonToGltf(circuitJsonWithFileUrls, {
      format: "gltf",
    })
    const gltfContent = JSON.stringify(gltfData, null, 2)
    fs.writeFileSync(outputPath, gltfContent, "utf-8")
    console.log(`Written ${gltfFilename}`)
  } catch (error) {
    console.error("Failed to generate GLTF:", error)
  }
}
