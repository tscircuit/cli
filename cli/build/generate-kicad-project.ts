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

export const getKicadPcbContent = (
  pcbConverter: CircuitJsonToKicadPcbConverter,
): string => {
  const kicadPcb = pcbConverter.getOutput() as any
  if (!kicadPcb) {
    return pcbConverter.getOutputString()
  }

  const normalizeFont = (font: any) => {
    if (!font) return
    const currentHeight = font.size?.height ?? 1
    // Source preview allocates 0.6 * fontSize per character
    const targetWidth = Math.round(currentHeight * 0.6 * 1000) / 1000
    font.size = { height: currentHeight, width: targetWidth }

    // Preserve native text height, use a 0.10-mm stroke for small text (<= 0.8mm),
    // and fit the native text width to the source allocation to prevent silk_edge_clearance
    // and text-to-text silk_overlap errors in native DRC (#4719)
    if (currentHeight <= 0.8) {
      font.thickness = 0.1
    }
  }

  const isSilkscreenLayer = (layer: any): boolean => {
    if (!layer) return false
    if (typeof layer === "string") {
      return layer.includes("F.SilkS") || layer.includes("B.SilkS")
    }
    if (Array.isArray(layer)) {
      return layer.some(
        (l) =>
          typeof l === "string" &&
          (l.includes("F.SilkS") || l.includes("B.SilkS")),
      )
    }
    if (Array.isArray(layer._names)) {
      return layer._names.some(
        (name: unknown) =>
          typeof name === "string" &&
          (name.includes("F.SilkS") || name.includes("B.SilkS")),
      )
    }
    if (typeof layer.getString === "function") {
      const str = layer.getString()
      return str.includes("F.SilkS") || str.includes("B.SilkS")
    }
    return false
  }

  for (const grText of kicadPcb.graphicTexts ?? []) {
    if (isSilkscreenLayer(grText.layer)) {
      normalizeFont(grText.effects?.font)
    }
  }

  for (const fp of kicadPcb.footprints ?? []) {
    for (const fpText of fp.fpTexts ?? []) {
      if (isSilkscreenLayer(fpText.layer)) {
        normalizeFont(fpText.effects?.font)
      }
    }
    for (const prop of fp.properties ?? []) {
      if (isSilkscreenLayer(prop.layer) && !prop.hide) {
        normalizeFont(prop.effects?.font)
      }
    }
  }

  return kicadPcb.getString()
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
  const pcbContent = getKicadPcbContent(pcbConverter)

  const proContent = createKicadProContent({
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
