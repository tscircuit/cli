import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import {
  CircuitJsonToKicadPcbConverter,
  CircuitJsonToKicadProConverter,
  CircuitJsonToKicadSchConverter,
  resolveAndLoadKicad3dModelFiles,
} from "circuit-json-to-kicad"
import { convertCircuitJsonToReadableNetlist } from "circuit-json-to-readable-netlist"
import { circuitJsonToStep } from "circuit-json-to-step"
import { circuitJsonToFdmComponentBox } from "circuit-json-to-fdm-component-box"
import {
  convertCircuitJsonToAssemblySvg,
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToStackedSchematicSheetsSvg,
} from "circuit-to-svg"
import { convertCircuitJsonToDsnString } from "dsn-converter"
import JSZip from "jszip"
import type { PcbSnapshotSettings } from "lib/project-config/project-config-schema"
import { getCircuitJsonToGltfOptions } from "lib/shared/get-circuit-json-to-gltf-options"
import { loadLocalStepModelFsMap } from "lib/shared/load-local-step-model-fs-map"
import { convertCircuitJsonToSchematicPdf } from "./convert-circuit-json-to-schematic-pdf"
import { importFromUserLand } from "./importFromUserLand"

import { convertCircuitJsonToGerbers } from "./convert-circuit-json-to-gerbers"
import type { ExportFormat } from "./export-snippet"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const unwrapSimpleRouteJson = (value: unknown) => {
  if (
    isRecord(value) &&
    isRecord(value.simpleRouteJson) &&
    ("connections" in value.simpleRouteJson ||
      "obstacles" in value.simpleRouteJson ||
      "bounds" in value.simpleRouteJson)
  ) {
    return value.simpleRouteJson
  }

  return value
}

export const convertCircuitJsonToExport = async ({
  circuitJson,
  format,
  filePath,
  platformConfig,
  pcbSnapshotSettings,
}: {
  circuitJson: AnyCircuitElement[]
  format: ExportFormat
  filePath: string
  platformConfig?: PlatformConfig
  pcbSnapshotSettings?: PcbSnapshotSettings
}): Promise<string | Buffer> => {
  const projectDir = path.dirname(filePath)
  const outputBaseName = path.basename(filePath).replace(/\.[^.]+$/, "")
  let outputContent: string | Buffer

  switch (format) {
    case "schematic-svg":
      outputContent = convertCircuitJsonToStackedSchematicSheetsSvg(circuitJson)
      break
    case "schematic-pdf":
      outputContent = await convertCircuitJsonToSchematicPdf(circuitJson)
      break
    case "pcb-svg":
      outputContent = convertCircuitJsonToPcbSvg(
        circuitJson,
        pcbSnapshotSettings,
      )
      break
    case "specctra-dsn":
      outputContent = convertCircuitJsonToDsnString(circuitJson)
      break
    case "readable-netlist":
      outputContent = convertCircuitJsonToReadableNetlist(circuitJson)
      break
    case "gltf":
      outputContent = JSON.stringify(
        await convertCircuitJsonToGltf(
          circuitJson,
          getCircuitJsonToGltfOptions({ format: "gltf" }),
        ),
        null,
        2,
      )
      break
    case "glb":
      outputContent = Buffer.from(
        (await convertCircuitJsonToGltf(
          circuitJson,
          getCircuitJsonToGltfOptions({ format: "glb" }),
        )) as ArrayBuffer,
      )
      break
    case "srj":
      {
        const userLandTscircuit = await importFromUserLand("tscircuit")
        const simpleRouteJson = unwrapSimpleRouteJson(
          userLandTscircuit.getSimpleRouteJsonFromCircuitJson({
            circuitJson,
          }),
        )
        outputContent = JSON.stringify(simpleRouteJson, null, 2)
      }
      break
    case "kicad_sch": {
      const converter = new CircuitJsonToKicadSchConverter(circuitJson)
      converter.runUntilFinished()
      outputContent = converter.getOutputString()
      break
    }
    case "kicad_pcb": {
      const converter = new CircuitJsonToKicadPcbConverter(circuitJson)
      converter.runUntilFinished()
      outputContent = converter.getOutputString()
      break
    }
    case "kicad_zip": {
      const schConverter = new CircuitJsonToKicadSchConverter(circuitJson)
      schConverter.runUntilFinished()
      const pcbConverter = new CircuitJsonToKicadPcbConverter(circuitJson, {
        includeBuiltin3dModels: true,
        projectName: outputBaseName,
      })
      pcbConverter.runUntilFinished()
      const proConverter = new CircuitJsonToKicadProConverter(circuitJson, {
        projectName: outputBaseName,
        schematicFilename: `${outputBaseName}.kicad_sch`,
        pcbFilename: `${outputBaseName}.kicad_pcb`,
      })
      proConverter.runUntilFinished()

      const zip = new JSZip()
      zip.file(`${outputBaseName}.kicad_sch`, schConverter.getOutputString())
      zip.file(`${outputBaseName}.kicad_pcb`, pcbConverter.getOutputString())
      zip.file(`${outputBaseName}.kicad_pro`, proConverter.getOutputString())

      await resolveAndLoadKicad3dModelFiles({
        model3dSourcePaths: pcbConverter.getModel3dSourcePaths(),
        projectName: outputBaseName,
        fetch: platformConfig?.platformFetch ?? globalThis.fetch,
        readFile: (modelPath) =>
          fs.promises.readFile(path.resolve(projectDir, modelPath)),
        onModelFile: ({ outputPath, content }) => {
          zip.file(outputPath, content)
        },
        onError: ({ sourcePath }) => {
          console.warn(`Failed to load 3D model from ${sourcePath}`)
        },
      })

      outputContent = await zip.generateAsync({ type: "nodebuffer" })
      break
    }
    case "gerbers":
      outputContent = (await convertCircuitJsonToGerbers(circuitJson))
        .gerbersZip
      break

    case "step":
      outputContent = await circuitJsonToStep(circuitJson, {
        includeComponents: true,
        includeExternalMeshes: true,
        fsMap: await loadLocalStepModelFsMap(circuitJson),
      })
      break
    case "assembly-svg":
      outputContent = convertCircuitJsonToAssemblySvg(circuitJson)
      break
    case "component-box-3mf":
      outputContent = Buffer.from(
        await circuitJsonToFdmComponentBox(circuitJson),
      )
      break
    default:
      outputContent = JSON.stringify(circuitJson, null, 2)
  }
  return outputContent
}
