import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import {
  CircuitJsonToKicadPcbConverter,
  CircuitJsonToKicadProConverter,
  CircuitJsonToKicadSchConverter,
  resolveAndLoadKicad3dModelFiles,
} from "circuit-json-to-kicad"
import type { AnyCircuitElement } from "circuit-json"

type GenerateKicadProjectOptions = {
  circuitJson: unknown[]
  outputDir: string
  projectName: string
  writeFiles: boolean
  platformConfig?: PlatformConfig
}

export type GeneratedKicadProject = {
  pcbContent: string
  schContent: string
  proContent: string
  outputDir: string
  projectName: string
}

export const buildKicadProContent = ({
  circuitJson,
  projectName,
  schematicFileName,
  boardFileName,
}: {
  circuitJson: AnyCircuitElement[]
  projectName: string
  schematicFileName: string
  boardFileName: string
}): string => {
  const proConverter = new CircuitJsonToKicadProConverter(circuitJson, {
    projectName,
    schematicFilename: schematicFileName,
    pcbFilename: boardFileName,
  })
  proConverter.runUntilFinished()
  const projectOutput = proConverter.getOutput()
  const pcbBoard = (
    circuitJson as unknown as Array<Record<string, unknown>>
  ).find((element) => element?.type === "pcb_board")
  if (
    typeof pcbBoard?.min_board_edge_clearance === "number" &&
    projectOutput?.board?.design_settings?.rules
  ) {
    ;(
      projectOutput.board.design_settings.rules as Record<string, unknown>
    ).min_copper_edge_clearance = pcbBoard.min_board_edge_clearance
  }
  return `${JSON.stringify(projectOutput, null, 2)}\n`
}

export const generateKicadProject = async ({
  circuitJson,
  outputDir,
  projectName,
  writeFiles,
  platformConfig,
}: GenerateKicadProjectOptions): Promise<GeneratedKicadProject> => {
  const sanitizedProjectName =
    projectName.trim().length > 0 ? projectName.trim() : "project"
  const schematicFileName = `${sanitizedProjectName}.kicad_sch`
  const boardFileName = `${sanitizedProjectName}.kicad_pcb`
  const projectFileName = `${sanitizedProjectName}.kicad_pro`

  const schConverter = new CircuitJsonToKicadSchConverter(
    circuitJson as AnyCircuitElement[],
  )
  schConverter.runUntilFinished()
  const schematicFiles = schConverter.getOutputFiles({
    schematicFilename: schematicFileName,
  })
  const schContent = schematicFiles.find(
    (schematicFile) => schematicFile.filename === schematicFileName,
  )?.content
  if (schContent === undefined) {
    throw new Error(`Missing root KiCad schematic: ${schematicFileName}`)
  }

  const pcbConverter = new CircuitJsonToKicadPcbConverter(
    circuitJson as AnyCircuitElement[],
    { includeBuiltin3dModels: true, projectName: sanitizedProjectName },
  )
  pcbConverter.runUntilFinished()
  const pcbContent = pcbConverter.getOutputString()

  const proContent = buildKicadProContent({
    circuitJson: circuitJson as AnyCircuitElement[],
    projectName: sanitizedProjectName,
    schematicFileName,
    boardFileName,
  })

  if (writeFiles) {
    fs.mkdirSync(outputDir, { recursive: true })
    for (const schematicFile of schematicFiles) {
      fs.writeFileSync(
        path.join(outputDir, schematicFile.filename),
        schematicFile.content,
      )
    }
    fs.writeFileSync(path.join(outputDir, boardFileName), pcbContent)
    fs.writeFileSync(path.join(outputDir, projectFileName), proContent)

    await resolveAndLoadKicad3dModelFiles({
      model3dSourcePaths: pcbConverter.getModel3dSourcePaths(),
      projectName: sanitizedProjectName,
      fetch: platformConfig?.platformFetch ?? globalThis.fetch,
      readFile: (modelPath) => fs.promises.readFile(modelPath),
      onModelFile: ({ outputPath, content }) => {
        const outputFilePath = path.join(outputDir, outputPath)
        fs.mkdirSync(path.dirname(outputFilePath), { recursive: true })
        fs.writeFileSync(outputFilePath, content)
      },
      onError: ({ sourcePath }) => {
        console.warn(`Failed to load 3D model from ${sourcePath}`)
      },
    })
  }

  return {
    pcbContent,
    schContent,
    proContent,
    outputDir,
    projectName: sanitizedProjectName,
  }
}
