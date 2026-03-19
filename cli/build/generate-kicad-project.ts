import fs from "node:fs"
import path from "node:path"
import {
  CircuitJsonToKicadPcbConverter,
  CircuitJsonToKicadSchConverter,
} from "circuit-json-to-kicad"
import type { AnyCircuitElement } from "circuit-json"

type GenerateKicadProjectOptions = {
  circuitJson: unknown[]
  outputDir: string
  projectName: string
  writeFiles: boolean
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

    // Download and write 3D model files
    const platformFetch = globalThis.fetch
    for (const modelPath of pcbConverter.getModel3dSourcePaths()) {
      const fileName = path.basename(modelPath)
      const isRemote =
        modelPath.startsWith("http://") || modelPath.startsWith("https://")
      const shapesDir = isRemote
        ? "tscircuit_builtin.3dshapes"
        : `${sanitizedProjectName}.3dshapes`
      const destDir = path.join(outputDir, `3dmodels/${shapesDir}`)
      fs.mkdirSync(destDir, { recursive: true })

      if (isRemote) {
        try {
          const response = await platformFetch(modelPath)
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer())
            fs.writeFileSync(path.join(destDir, fileName), buffer)
          }
        } catch (error) {
          console.warn(`Failed to fetch 3D model from ${modelPath}`)
        }
      } else if (fs.existsSync(modelPath)) {
        fs.copyFileSync(modelPath, path.join(destDir, fileName))
      }
    }
  }

  return {
    pcbContent,
    schContent,
    proContent,
    outputDir,
    projectName: sanitizedProjectName,
  }
}
