import fs from "node:fs"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { renderCircuitJsonTo3dPng } from "circuit-json-to-3d-png"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import type { PcbSnapshotSettings } from "lib/project-config/project-config-schema"
import type { BuildImageFormatSelection } from "./image-format-selection"
import { convertSvgToPngBuffer } from "./svg-to-png"
import { writeSimulationSvgAssetsFromCircuitJson } from "./worker-output-generators"

export interface BuildFileResult {
  sourcePath: string
  outputPath: string
  ok: boolean
}

const generatePreviewAssets = async ({
  build,
  outputDir,
  distDir,
  imageFormats,
  pcbSnapshotSettings,
}: {
  build: BuildFileResult
  outputDir: string
  distDir: string
  imageFormats: BuildImageFormatSelection
  pcbSnapshotSettings?: PcbSnapshotSettings
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

  if (imageFormats.pcbSvgs) {
    try {
      console.log(`${prefix}Generating PCB SVG...`)
      const pcbSvg = convertCircuitJsonToPcbSvg(
        circuitJson,
        pcbSnapshotSettings,
      )
      fs.writeFileSync(path.join(outputDir, "pcb.svg"), pcbSvg, "utf-8")
      console.log(`${prefix}Written pcb.svg`)
    } catch (error) {
      console.error(`${prefix}Failed to generate PCB SVG:`, error)
    }
  }

  if (imageFormats.pcbPngs) {
    try {
      console.log(`${prefix}Generating PCB PNG...`)
      const pcbSvg = convertCircuitJsonToPcbSvg(
        circuitJson,
        pcbSnapshotSettings,
      )
      fs.writeFileSync(
        path.join(outputDir, "pcb.png"),
        await convertSvgToPngBuffer(pcbSvg),
      )
      console.log(`${prefix}Written pcb.png`)
    } catch (error) {
      console.error(`${prefix}Failed to generate PCB PNG:`, error)
    }
  }

  if (imageFormats.schematicSvgs) {
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
  }

  if (imageFormats.simulationSvgs || imageFormats.simulationSchematicSvgs) {
    try {
      const wroteSimulationSvgs = writeSimulationSvgAssetsFromCircuitJson(
        circuitJson,
        outputDir,
        imageFormats,
      )
      if (wroteSimulationSvgs) {
        if (imageFormats.simulationSvgs) {
          console.log(`${prefix}Written simulation.svg`)
        }
        if (imageFormats.simulationSchematicSvgs) {
          console.log(`${prefix}Written simulation-schematic.svg`)
        }
      }
    } catch (error) {
      console.error(`${prefix}Failed to generate simulation SVGs:`, error)
    }
  }

  if (imageFormats.threeDPngs) {
    try {
      console.log(`${prefix}Generating 3D PNG...`)
      const pngBuffer = await renderCircuitJsonTo3dPng(circuitJson)
      fs.writeFileSync(path.join(outputDir, "3d.png"), Buffer.from(pngBuffer))
      console.log(`${prefix}Written 3d.png`)
    } catch (error) {
      console.error(`${prefix}Failed to generate 3D PNG:`, error)
    }
  }
}

export const buildPreviewImages = async ({
  builtFiles,
  distDir,
  mainEntrypoint,
  previewComponentPath,
  allImages,
  imageFormats,
  pcbSnapshotSettings,
}: {
  builtFiles: BuildFileResult[]
  distDir: string
  mainEntrypoint?: string
  previewComponentPath?: string
  allImages?: boolean
  imageFormats: BuildImageFormatSelection
  pcbSnapshotSettings?: PcbSnapshotSettings
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
        imageFormats,
        pcbSnapshotSettings,
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
    outputDir: path.dirname(previewBuild.outputPath),
    pcbSnapshotSettings,
    distDir,
    imageFormats,
  })
}
