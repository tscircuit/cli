import fs from "node:fs"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { renderCircuitJsonTo3dPng } from "circuit-json-to-3d-png"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import { circuitJsonToStep } from "circuit-json-to-step"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { loadLocalStepModelFsMap } from "lib/shared/load-local-step-model-fs-map"
import { getSimulationSvgAssetsFromCircuitJson } from "lib/shared/simulation-svg-assets"
import type { PcbSnapshotSettings } from "../../lib/project-config/project-config-schema"
import { convertSvgToPngBuffer } from "../../lib/shared/convert-svg-to-png"
import { getCircuitJsonToGltfOptions } from "../../lib/shared/get-circuit-json-to-gltf-options"
import { convertModelUrlsToFileUrls } from "./convert-model-urls-to-file-urls"
import type { BuildImageFormatSelection } from "./image-format-selection"
import { normalizeToUint8Array } from "./worker-binary-utils"

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

  if (imageFormats.schematicSvgs) {
    const schematicSvg = convertCircuitJsonToSchematicSvg(circuitJson)
    fs.writeFileSync(
      path.join(outputDir, "schematic.svg"),
      schematicSvg,
      "utf-8",
    )
  }

  writeSimulationSvgAssetsFromCircuitJson(circuitJson, outputDir, imageFormats)

  if (imageFormats.threeDPngs) {
    const pngBuffer = await renderCircuitJsonTo3dPng(circuitJson)

    fs.writeFileSync(path.join(outputDir, "3d.png"), Buffer.from(pngBuffer))
  }
}
