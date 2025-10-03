import fs from "node:fs"
import path from "node:path"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { convertCircuitJsonToSimple3dSvg } from "circuit-json-to-simple-3d"
import sharp from "sharp"

export interface BuildFileResult {
  sourcePath: string
  outputPath: string
  ok: boolean
}

export const buildPreviewImages = async ({
  builtFiles,
  distDir,
  mainEntrypoint,
}: {
  builtFiles: BuildFileResult[]
  distDir: string
  mainEntrypoint?: string
}) => {
  const successfulBuilds = builtFiles.filter((file) => file.ok)
  const normalizedMainEntrypoint = mainEntrypoint
    ? path.resolve(mainEntrypoint)
    : undefined

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

  try {
    const circuitJsonRaw = fs.readFileSync(previewBuild.outputPath, "utf-8")
    const circuitJson = JSON.parse(circuitJsonRaw)

    console.log("Generating PCB SVG...")
    const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson)
    console.log("Generating schematic SVG...")
    const schematicSvg = convertCircuitJsonToSchematicSvg(circuitJson)
    console.log("Generating 3D SVG...")
    const simple3dSvg = await convertCircuitJsonToSimple3dSvg(circuitJson)

    fs.writeFileSync(path.join(distDir, "pcb.svg"), pcbSvg, "utf-8")
    console.log("Written pcb.svg")
    fs.writeFileSync(path.join(distDir, "schematic.svg"), schematicSvg, "utf-8")
    console.log("Written schematic.svg")

    if (simple3dSvg) {
      const pngBuffer = await sharp(Buffer.from(simple3dSvg)).png().toBuffer()
      fs.writeFileSync(path.join(distDir, "3d.png"), pngBuffer)
      console.log("Written 3d.png")
    }
  } catch (error) {
    console.error("Failed to generate preview images:", error)
  }
}
