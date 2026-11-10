import { convertCircuitJsonToPcbSvg } from "lib/shared/render-pcb-svg"
import fs from "node:fs"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { render3dThumbnail } from "lib/shared/render-3d-thumbnail"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import { circuitJsonToStep } from "circuit-json-to-step"
import {
  convertCircuitJsonToAssemblySvg,
  convertCircuitJsonToStackedSchematicSheetsSvg,
} from "circuit-to-svg"
import { getSystemSvgAssets } from "lib/shared/system-svg-assets"
import { loadLocalStepModelFsMap } from "lib/shared/load-local-step-model-fs-map"
import { getSimulationSvgAssetsFromCircuitJson } from "lib/shared/simulation-svg-assets"
import type { PcbSnapshotSettings } from "../../lib/project-config/project-config-schema"
import { convertSvgToPngBuffer } from "../../lib/shared/convert-svg-to-png"
import { getCircuitJsonToGltfOptions } from "../../lib/shared/get-circuit-json-to-gltf-options"
import { convertModelUrlsToFileUrls } from "./convert-model-urls-to-file-urls"
import type { BuildImageFormatSelection } from "./image-format-selection"
import { normalizeToUint8Array } from "./worker-binary-utils"

export const writeDiagramSvgAssetsFromCircuitJson = async (
  circuitJson: AnyCircuitElement[],
  outputDir: string,
  imageFormats: BuildImageFormatSelection,
) => {
  if (!imageFormats.systemSvgs && !imageFormats.assemblySvgs) return []
  const assets: Array<{ fileName: string; svg: string }> = []
  if (imageFormats.systemSvgs)
    assets.push(...(await getSystemSvgAssets(circuitJson)))
  if (
    imageFormats.assemblySvgs &&
    circuitJson.some((e) => e.type === "pcb_board")
  ) {
    assets.push({
      fileName: "assembly.svg",
      svg: convertCircuitJsonToAssemblySvg([...circuitJson]),
    })
  }
  // Remove previews for pages or boards that disappeared since the last build.
  const generatedNames = new Set(assets.map((asset) => asset.fileName))
  for (const fileName of fs.readdirSync(outputDir)) {
    const selected =
      (imageFormats.systemSvgs && /^system(?:-.*)?\.svg$/.test(fileName)) ||
      (imageFormats.assemblySvgs && fileName === "assembly.svg")
    if (selected && !generatedNames.has(fileName))
      fs.rmSync(path.join(outputDir, fileName), { force: true })
  }
  for (const { fileName, svg } of assets)
    fs.writeFileSync(path.join(outputDir, fileName), svg, "utf-8")
  return assets.map((asset) => asset.fileName)
}

export const writeSimulationSvgAssetsFromCircuitJson = (
  circuitJson: AnyCircuitElement[],
  outputDir: string,
  imageFormats: BuildImageFormatSelection,
) => {
  if (!imageFormats.simulationSvgs && !imageFormats.simulationSchematicSvgs) {
    return false
  }

  const simulationSvgAssets = getSimulationSvgAssetsFromCircuitJson(circuitJson)
  if (simulationSvgAssets.length === 0) return false

  const hasMultipleSimulations = simulationSvgAssets.length > 1
  const simulationFileNames: string[] = []
  const schematicSimulationFileNames: string[] = []

  for (const simulationSvgAsset of simulationSvgAssets) {
    if (imageFormats.simulationSvgs) {
      const fileName = hasMultipleSimulations
        ? `simulation-${simulationSvgAsset.fileNameSuffix}.svg`
        : "simulation.svg"
      fs.writeFileSync(
        path.join(outputDir, fileName),
        simulationSvgAsset.simulationSvg,
        "utf-8",
      )
      simulationFileNames.push(fileName)
    }

    if (imageFormats.simulationSchematicSvgs) {
      const fileName = hasMultipleSimulations
        ? `simulation-schematic-${simulationSvgAsset.fileNameSuffix}.svg`
        : "simulation-schematic.svg"
      fs.writeFileSync(
        path.join(outputDir, fileName),
        simulationSvgAsset.schematicSimulationSvg,
        "utf-8",
      )
      schematicSimulationFileNames.push(fileName)
    }
  }

  return { simulationFileNames, schematicSimulationFileNames }
}

export const writeGlbFromCircuitJson = async (
  circuitJson: AnyCircuitElement[],
  glbOutputPath: string,
) => {
  const circuitJsonWithFileUrls = convertModelUrlsToFileUrls(circuitJson)
  const glbBuffer = await convertCircuitJsonToGltf(
    circuitJsonWithFileUrls,
    getCircuitJsonToGltfOptions({ format: "glb" }),
  )

  const glbData = normalizeToUint8Array(glbBuffer)
  fs.mkdirSync(path.dirname(glbOutputPath), { recursive: true })
  fs.writeFileSync(glbOutputPath, Buffer.from(glbData))
}

export const writeStepFromCircuitJson = async (
  circuitJson: AnyCircuitElement[],
  stepOutputPath: string,
) => {
  const stepContent = await circuitJsonToStep(circuitJson, {
    exportMode: "pcb",
    includeComponents: true,
    includeExternalMeshes: true,
    fsMap: await loadLocalStepModelFsMap(circuitJson),
  })

  fs.mkdirSync(path.dirname(stepOutputPath), { recursive: true })
  fs.writeFileSync(stepOutputPath, stepContent)
}

export const writeImageAssetsFromCircuitJson = async (
  circuitJson: AnyCircuitElement[],
  options: {
    outputDir: string
    imageFormats: BuildImageFormatSelection
    pcbSnapshotSettings?: PcbSnapshotSettings
  },
) => {
  const { outputDir, imageFormats, pcbSnapshotSettings } = options
  fs.mkdirSync(outputDir, { recursive: true })
  const hasSchematic = circuitJson.some((e) => e.type.startsWith("schematic_"))
  if (!hasSchematic) {
    if (imageFormats.schematicSvgs)
      fs.rmSync(path.join(outputDir, "schematic.svg"), { force: true })
    if (imageFormats.schematicPngs)
      fs.rmSync(path.join(outputDir, "schematic.png"), { force: true })
  }

  if (imageFormats.pcbSvgs) {
    const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson, pcbSnapshotSettings)
    fs.writeFileSync(path.join(outputDir, "pcb.svg"), pcbSvg, "utf-8")
  }

  if (imageFormats.pcbPngs) {
    const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson, pcbSnapshotSettings)
    fs.writeFileSync(
      path.join(outputDir, "pcb.png"),
      await convertSvgToPngBuffer(pcbSvg),
    )
  }

  if (imageFormats.schematicSvgs && hasSchematic) {
    const schematicSvg =
      convertCircuitJsonToStackedSchematicSheetsSvg(circuitJson)
    fs.writeFileSync(
      path.join(outputDir, "schematic.svg"),
      schematicSvg,
      "utf-8",
    )
  }

  if (imageFormats.schematicPngs && hasSchematic) {
    const schematicSvg =
      convertCircuitJsonToStackedSchematicSheetsSvg(circuitJson)
    fs.writeFileSync(
      path.join(outputDir, "schematic.png"),
      await convertSvgToPngBuffer(schematicSvg),
    )
  }

  writeSimulationSvgAssetsFromCircuitJson(circuitJson, outputDir, imageFormats)
  await writeDiagramSvgAssetsFromCircuitJson(
    circuitJson,
    outputDir,
    imageFormats,
  )

  if (imageFormats.threeDPngs) {
    const pngBuffer = await render3dThumbnail(circuitJson)

    fs.writeFileSync(path.join(outputDir, "3d.png"), Buffer.from(pngBuffer))
  }
}
