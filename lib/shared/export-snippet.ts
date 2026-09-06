import fs from "node:fs"
import path from "node:path"
import { promisify } from "node:util"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import type { PcbSnapshotSettings } from "lib/project-config/project-config-schema"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getOrGenerateCircuitJson } from "lib/shared/get-or-generate-circuit-json"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import { mergePlatformConfigs } from "lib/shared/platform-config-utils"
import { convertToKicadLibrary } from "./convert-to-kicad-library"
import { isCircuitJsonFile } from "./is-circuit-json-file"
import { convertCircuitJsonToExport } from "./convert-circuit-json-to-export"
import { exportReleasePreset } from "./export-release-preset"

const writeFileAsync = promisify(fs.writeFile)

export const ALLOWED_EXPORT_FORMATS = [
  "json",
  "circuit-json",
  "schematic-svg",
  "schematic-pdf",
  "pcb-svg",
  "gerbers",
  "readable-netlist",
  "gltf",
  "glb",
  "specctra-dsn",
  "kicad_sch",
  "kicad_pcb",
  "kicad_zip",
  "kicad-library",
  "srj",
  "step",
  "assembly-svg",
  "component-box-3mf",
] as const

export type ExportFormat = (typeof ALLOWED_EXPORT_FORMATS)[number]

const OUTPUT_EXTENSIONS: Record<ExportFormat, string> = {
  json: ".circuit.json",
  "circuit-json": ".circuit.json",
  "schematic-svg": "-schematic.svg",
  "schematic-pdf": "-schematic.pdf",
  "pcb-svg": "-pcb.svg",
  "assembly-svg": "-assembly.svg",
  gerbers: "-gerbers.zip",
  "readable-netlist": "-readable.netlist",
  gltf: ".gltf",
  glb: ".glb",
  "specctra-dsn": ".dsn",
  kicad_sch: ".kicad_sch",
  kicad_pcb: ".kicad_pcb",
  kicad_zip: "-kicad.zip",
  "kicad-library": "",
  srj: ".simple-route.json",
  step: ".step",
  "component-box-3mf": "-component-box.3mf",
}

type ExportOptions = {
  filePath: string
  format?: ExportFormat
  preset?: "release"
  writeFile?: boolean
  outputPath?: string
  platformConfig?: PlatformConfig
  pcbSnapshotSettings?: PcbSnapshotSettings
  onExit?: (code: number) => void
  onError?: (message: string) => void
  onSuccess: (data: {
    outputDestination: string
    outputContent: string | Buffer
  }) => void
}

export const exportSnippet = async ({
  filePath,
  format: formatOption,
  preset,
  outputPath,
  platformConfig,
  pcbSnapshotSettings,
  writeFile = true,
  onExit = (code) => process.exit(code),
  onError = (message) => console.error(message),
  onSuccess = (result: unknown) => console.log(result),
}: ExportOptions) => {
  if (preset && formatOption) {
    onError("The release preset cannot be combined with a format")
    return onExit(1)
  }
  const format = formatOption ?? "json"
  if (!ALLOWED_EXPORT_FORMATS.includes(format)) {
    onError(`Invalid format: ${format}`)
    return onExit(1)
  }

  const projectDir = path.dirname(filePath)
  const outputBaseName = path.basename(filePath).replace(/\.[^.]+$/, "")
  let outputFileName = `${outputBaseName}${OUTPUT_EXTENSIONS[format]}`
  if (preset === "release") {
    if (!writeFile) {
      onError("The release preset requires writing to an output directory")
      return onExit(1)
    }
    outputFileName = path.join("dist", "release")
  }
  const outputDestination =
    outputPath && path.isAbsolute(outputPath)
      ? outputPath
      : path.join(projectDir, outputPath ?? outputFileName)

  // Handle kicad-library separately - it doesn't need generateCircuitJson
  if (format === "kicad-library") {
    try {
      const result = await convertToKicadLibrary({
        filePath,
        libraryName: outputBaseName,
        outputDir: outputDestination,
      })
      if (writeFile) {
        onSuccess({ outputDestination: result.outputDir, outputContent: "" })
      }
      return onExit(0)
    } catch (err) {
      onError(`Error exporting KiCad library: ${err}`)
      return onExit(1)
    }
  }

  let circuitJson: AnyCircuitElement[]

  if (isCircuitJsonFile(filePath)) {
    const rawCircuitJson = await fs.promises
      .readFile(filePath, "utf-8")
      .catch((err) => {
        onError(`Error reading circuit JSON file: ${err}`)
        return null
      })

    if (!rawCircuitJson) return onExit(1)

    try {
      const parsedCircuitJson = JSON.parse(rawCircuitJson)
      if (!Array.isArray(parsedCircuitJson)) {
        onError("Error parsing circuit JSON file: expected an array")
        return onExit(1)
      }
      circuitJson = parsedCircuitJson as AnyCircuitElement[]
    } catch (err) {
      onError(`Error parsing circuit JSON file: ${err}`)
      return onExit(1)
    }
  } else {
    const isJlcpcbFabricationExport =
      format === "gerbers" || preset === "release"
    const fabricationPlatformConfig = isJlcpcbFabricationExport
      ? getPlatformConfigWithCliDefaults(
          mergePlatformConfigs(platformConfig, {
            enablePartOrientationAnalysis: true,
          }),
        )
      : platformConfig
    const generateCircuitData = isJlcpcbFabricationExport
      ? generateCircuitJson
      : getOrGenerateCircuitJson
    const circuitData = await generateCircuitData({
      filePath,
      saveToFile: !preset && format === "circuit-json",
      platformConfig: fabricationPlatformConfig,
    }).catch((err) => {
      onError(`Error generating circuit JSON: ${err}`)
      return null
    })

    if (!circuitData) return onExit(1)
    circuitJson = circuitData.circuitJson
  }

  if (preset === "release") {
    try {
      await exportReleasePreset({
        circuitJson,
        filePath,
        outputDestination,
        platformConfig,
        pcbSnapshotSettings,
      })
      onSuccess({ outputDestination, outputContent: "" })
      return onExit(0)
    } catch (err) {
      onError(`Error exporting release: ${err}`)
      return onExit(1)
    }
  }

  const outputContent = await convertCircuitJsonToExport({
    circuitJson,
    format,
    filePath,
    platformConfig,
    pcbSnapshotSettings,
  })
  if (writeFile) {
    await writeFileAsync(outputDestination, outputContent).catch((err) => {
      onError(`Error writing file: ${err}`)
      return onExit(1)
    })
  }

  onSuccess({
    outputDestination,
    outputContent,
  })

  onExit(0)
}
