import {
  fetchEasyEDAComponent,
  convertRawEasyEdaToTs as convertRawEasyToTsx,
  convertEasyEdaJsonToCircuitJson,
} from "easyeda"
import fs from "node:fs/promises"
import path from "node:path"
import { getCompletePlatformConfig } from "lib/shared/get-complete-platform-config"

export interface ImportOptions {
  download?: boolean
  projectDir?: string
}

/**
 * Imports a component from JLCPCB/EasyEDA, optionally downloading its 3D model.
 */
export const importComponentFromJlcpcb = async (
  jlcpcbPartNumber: string,
  options: ImportOptions | string = {},
) => {
  const projectDir =
    typeof options === "string" ? options : options.projectDir || process.cwd()
  const shouldDownload =
    typeof options === "object" ? Boolean(options.download) : false

  const component = await fetchEasyEDAComponent(jlcpcbPartNumber)
  let tsxContent = await convertRawEasyToTsx(component)

  const componentNameMatch = tsxContent.match(/export const (\w+) = .*/)
  const fileName = componentNameMatch?.[1]
  if (!fileName) {
    throw new Error("Could not determine file name of converted component")
  }

  const importsDir = path.join(projectDir, "imports")
  const componentDir = path.join(importsDir, fileName)
  await fs.mkdir(componentDir, { recursive: true })

  let modelFilePaths: string[] = []
  if (shouldDownload) {
    const result = await downloadAndLocalize3dModel({
      tsxContent,
      jlcpcbPartNumber,
      componentDir,
      component,
    })
    tsxContent = result.tsxContent
    modelFilePaths = result.modelFilePaths
  }

  const filePath = path.join(componentDir, "index.tsx")
  await fs.writeFile(filePath, tsxContent)

  return { filePath, modelFilePaths }
}

/**
 * Downloads the 3D models referenced in the component and updates the TSX to use local paths.
 */
async function downloadAndLocalize3dModel(params: {
  tsxContent: string
  jlcpcbPartNumber: string
  componentDir: string
  component: any
}): Promise<{ tsxContent: string; modelFilePaths: string[] }> {
  let { tsxContent } = params
  const { jlcpcbPartNumber, componentDir, component } = params
  const modelFilePaths: string[] = []

  const platformConfig = getCompletePlatformConfig()
  const platformFetch = platformConfig.platformFetch ?? globalThis.fetch

  // Extract remote URLs from the circuit JSON (more robust than regex on TSX)
  const circuitJson = convertEasyEdaJsonToCircuitJson(component, {
    useModelCdn: true,
    shouldRecenter: true,
  })
  const remoteUrls: string[] = circuitJson
    .filter((item: any) => item.type === "cad_component" && item.model_obj_url)
    .map((item: any) => item.model_obj_url)

  // Fallback: if no model URLs found in circuitJson, try to extract from TSX
  if (remoteUrls.length === 0) {
    const objUrlMatch = tsxContent.match(/objUrl:\s*"([^"]+)"/)
    if (objUrlMatch?.[1]) {
      remoteUrls.push(objUrlMatch[1])
    }
  }

  for (const remoteUrl of remoteUrls) {
    try {
      const response = await platformFetch(remoteUrl)
      if (!response.ok) {
        console.warn(`Failed to download 3D model from ${remoteUrl}`)
        continue
      }

      const modelFileName = `${jlcpcbPartNumber}.obj`

      const modelFilePath = path.join(componentDir, modelFileName)
      const arrayBuffer = await response.arrayBuffer()
      await fs.writeFile(modelFilePath, Buffer.from(arrayBuffer))
      modelFilePaths.push(modelFilePath)

      // Update TSX to use relative path (safer because we know the exact remote URL)
      const localModelPath = `./${modelFileName}`

      // We replace the remote URL wherever it appears in the TSX content
      // This works because the URL is unique and identifies the objUrl/modelUrl prop
      tsxContent = tsxContent
        .split(`"${remoteUrl}"`)
        .join(`"${localModelPath}"`)
    } catch (error) {
      console.error("Error downloading 3D model:", error)
    }
  }

  return { tsxContent, modelFilePaths }
}
