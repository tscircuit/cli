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

type GenerateKicadProjectOptions = {
  circuitJson: unknown[]
  outputDir: string
  projectName: string
  writeFiles: boolean
  /** Map of RefDes prefix to kicadFootprintMetadata */
  footprintMetadataMap?: Map<string, KicadFootprintMetadata>
  /** Map of RefDes prefix to kicadSymbolMetadata */
  symbolMetadataMap?: Map<string, KicadSymbolMetadata>
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
  footprintMetadataMap,
  symbolMetadataMap,
}: GenerateKicadProjectOptions): Promise<GeneratedKicadProject> => {
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
