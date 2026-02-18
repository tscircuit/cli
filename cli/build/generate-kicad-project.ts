import fs from "node:fs"
import path from "node:path"
import {
  CircuitJsonToKicadPcbConverter,
  CircuitJsonToKicadSchConverter,
} from "circuit-json-to-kicad"
import type {
  KicadFootprintMetadata,
  KicadSymbolMetadata,
} from "@tscircuit/props"
import { extractKicadMetadataForKicadProject } from "lib/shared/extract-kicad-metadata-for-kicad-project"
import { registerStaticAssetLoaders } from "lib/shared/register-static-asset-loaders"
import { pathToFileURL } from "node:url"

type GenerateKicadProjectOptions = {
  circuitJson: unknown[]
  outputDir: string
  projectName: string
  writeFiles: boolean
  /** Path to the source file for metadata extraction */
  filePath?: string
}

export type GeneratedKicadProject = {
  pcbContent: string
  schContent: string
  proContent: string
  outputDir: string
  projectName: string
}

const createKicadProContent = ({
  projectName,
  schematicFileName,
  boardFileName,
}: {
  projectName: string
  schematicFileName: string
  boardFileName: string
}) =>
  JSON.stringify(
    {
      head: {
        version: 1,
        generator: "tsci",
      },
      project: {
        name: projectName,
        files: {
          schematic: schematicFileName,
          board: boardFileName,
        },
      },
    },
    null,
    2,
  )

export const generateKicadProject = async ({
  circuitJson,
  outputDir,
  projectName,
  writeFiles,
  filePath,
}: GenerateKicadProjectOptions): Promise<GeneratedKicadProject> => {
  // Extract kicad metadata from source file if provided
  let footprintMetadataMap: Map<string, KicadFootprintMetadata> | undefined
  let symbolMetadataMap: Map<string, KicadSymbolMetadata> | undefined

  if (filePath) {
    try {
      registerStaticAssetLoaders()
      const module = await import(pathToFileURL(filePath).href)
      const Component = module.default || Object.values(module)[0]
      if (Component && typeof Component === "function") {
        const metadata = extractKicadMetadataForKicadProject(Component)
        if (metadata.footprintMetadataMap.size > 0) {
          footprintMetadataMap = metadata.footprintMetadataMap
          console.log(
            `  Found ${footprintMetadataMap.size} footprint metadata entries`,
          )
        }
        if (metadata.symbolMetadataMap.size > 0) {
          symbolMetadataMap = metadata.symbolMetadataMap
          console.log(
            `  Found ${symbolMetadataMap.size} symbol metadata entries`,
          )
        }
      }
    } catch (err) {
      console.log(`  Warning: Could not extract kicad metadata: ${err}`)
    }
  }

  const schConverter = new CircuitJsonToKicadSchConverter(
    circuitJson as unknown as any[],
    symbolMetadataMap ? { symbolMetadataMap } : undefined,
  )
  schConverter.runUntilFinished()
  const schContent = schConverter.getOutputString()

  const pcbConverter = new CircuitJsonToKicadPcbConverter(
    circuitJson as unknown as any[],
    footprintMetadataMap ? { footprintMetadataMap } : undefined,
  )
  pcbConverter.runUntilFinished()
  const pcbContent = pcbConverter.getOutputString()

  const sanitizedProjectName =
    projectName.trim().length > 0 ? projectName.trim() : "project"
  const schematicFileName = `${sanitizedProjectName}.kicad_sch`
  const boardFileName = `${sanitizedProjectName}.kicad_pcb`
  const projectFileName = `${sanitizedProjectName}.kicad_pro`

  const proContent = createKicadProContent({
    projectName: sanitizedProjectName,
    schematicFileName,
    boardFileName,
  })

  if (writeFiles) {
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(path.join(outputDir, schematicFileName), schContent)
    fs.writeFileSync(path.join(outputDir, boardFileName), pcbContent)
    fs.writeFileSync(path.join(outputDir, projectFileName), proContent)
  }

  return {
    pcbContent,
    schContent,
    proContent,
    outputDir,
    projectName: sanitizedProjectName,
  }
}
