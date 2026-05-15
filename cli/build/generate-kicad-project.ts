import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import {
  CircuitJsonToKicadPcbConverter,
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
  platformConfig,
}: GenerateKicadProjectOptions): Promise<GeneratedKicadProject> => {
  const schConverter = new CircuitJsonToKicadSchConverter(
    circuitJson as AnyCircuitElement[],
  )
  schConverter.runUntilFinished()
  const schContent = schConverter.getOutputString()

  const sanitizedProjectName =
    projectName.trim().length > 0 ? projectName.trim() : "project"

  const pcbConverter = new CircuitJsonToKicadPcbConverter(
    circuitJson as AnyCircuitElement[],
    { includeBuiltin3dModels: true, projectName: sanitizedProjectName },
  )
  pcbConverter.runUntilFinished()
  const pcbContent = pcbConverter.getOutputString()
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
