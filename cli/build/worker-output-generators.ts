import fs from "node:fs"
import path from "node:path"
import type {
  AnyCircuitElement,
  SimulationTransientVoltageGraph,
} from "circuit-json"
import { circuitJsonToStep } from "circuit-json-to-step"
import {
  convertCircuitJsonToGltf,
  getBestCameraPosition,
} from "circuit-json-to-gltf"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
  convertCircuitJsonToSchematicSimulationSvg,
  convertCircuitJsonToSimulationGraphSvg,
  isSimulationExperiment,
  isSimulationTransientVoltageGraph,
} from "circuit-to-svg"
import { renderGLTFToPNGFromGLB } from "poppygl"
import { getCircuitJsonToGltfOptions } from "../../lib/shared/get-circuit-json-to-gltf-options"
import type { PcbSnapshotSettings } from "../../lib/project-config/project-config-schema"
import { convertModelUrlsToFileUrls } from "./convert-model-urls-to-file-urls"
import {
  normalizeToArrayBuffer,
  normalizeToUint8Array,
} from "./worker-binary-utils"
import type { BuildImageFormatSelection } from "./image-format-selection"
import { convertSvgToPngBuffer } from "./svg-to-png"
import { loadLocalStepModelFsMap } from "lib/shared/load-local-step-model-fs-map"

const getSimulationSvgInputs = (circuitJson: AnyCircuitElement[]) => {
  const simulationExperiment = circuitJson.find(isSimulationExperiment)
  if (!simulationExperiment) return undefined

  const simulationTransientVoltageGraphIds = circuitJson
    .filter(
      (element): element is SimulationTransientVoltageGraph =>
        isSimulationTransientVoltageGraph(element) &&
        element.simulation_experiment_id ===
          simulationExperiment.simulation_experiment_id,
    )
    .map((element) => element.simulation_transient_voltage_graph_id)

  if (simulationTransientVoltageGraphIds.length === 0) return undefined

  return {
    simulation_experiment_id: simulationExperiment.simulation_experiment_id,
    simulation_transient_voltage_graph_ids: simulationTransientVoltageGraphIds,
  }
}

export const writeSimulationSvgAssetsFromCircuitJson = (
  circuitJson: AnyCircuitElement[],
  outputDir: string,
  imageFormats: BuildImageFormatSelection,
) => {
  if (!imageFormats.simulationSvgs && !imageFormats.schematicSimulationSvgs) {
    return false
  }

  const simulationSvgInputs = getSimulationSvgInputs(circuitJson)
  if (!simulationSvgInputs) return false

  if (imageFormats.simulationSvgs) {
    const simulationSvg = convertCircuitJsonToSimulationGraphSvg({
      circuitJson,
      ...simulationSvgInputs,
    })
    fs.writeFileSync(
      path.join(outputDir, "simulation.svg"),
      simulationSvg,
      "utf-8",
    )
  }

  if (imageFormats.schematicSimulationSvgs) {
    const schematicSimulationSvg = convertCircuitJsonToSchematicSimulationSvg({
      circuitJson,
      ...simulationSvgInputs,
    })
    fs.writeFileSync(
      path.join(outputDir, "schematic-simulation.svg"),
      schematicSimulationSvg,
      "utf-8",
    )
  }

  return true
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
    const circuitJsonWithFileUrls = convertModelUrlsToFileUrls(circuitJson)
    const glbBuffer = await convertCircuitJsonToGltf(
      circuitJsonWithFileUrls,
      getCircuitJsonToGltfOptions({ format: "glb" }),
    )
    const glbArrayBuffer = await normalizeToArrayBuffer(glbBuffer)
    const pngBuffer = await renderGLTFToPNGFromGLB(
      glbArrayBuffer,
      getBestCameraPosition(circuitJson),
    )

    fs.writeFileSync(
      path.join(outputDir, "3d.png"),
      Buffer.from(normalizeToUint8Array(pngBuffer)),
    )
  }
}
