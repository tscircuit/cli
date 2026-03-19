import { fetchEasyEDAComponent, convertRawEasyToTsx } from "easyeda/browser"
import fs from "node:fs/promises"
import path from "node:path"

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

  if (shouldDownload) {
    tsxContent = await downloadAndLocalize3dModel({
      tsxContent,
      jlcpcbPartNumber,
      componentDir,
    })
  }

  const filePath = path.join(componentDir, "index.tsx")
  await fs.writeFile(filePath, tsxContent)

  return { filePath }
}

/**
 * Downloads the 3D model referenced in the TSX and updates the TSX to use a local path.
 */
async function downloadAndLocalize3dModel(params: {
  tsxContent: string
  jlcpcbPartNumber: string
  componentDir: string
}): Promise<string> {
  const { tsxContent, jlcpcbPartNumber, componentDir } = params

  const objUrlMatch = tsxContent.match(/objUrl: "(https?:\/\/[^"]+)"/)
  const modelUrlMatch = tsxContent.match(/modelUrl: "(https?:\/\/[^"]+)"/)
  const remoteUrlMatch = objUrlMatch || modelUrlMatch

  if (!remoteUrlMatch) {
    return tsxContent
  }

  const remoteUrl = remoteUrlMatch[1]

  try {
    const response = await fetch(remoteUrl)
    if (!response.ok) {
      console.warn(`Failed to download 3D model from ${remoteUrl}`)
      return tsxContent
    }

    const contentDisposition = response.headers.get("content-disposition")
    let modelFileName = `${jlcpcbPartNumber}.obj`

    if (contentDisposition) {
      // Robust extraction of filename from content-disposition
      const filenameMatch = contentDisposition.match(
        /filename\*?=['"]?([^;'"\n]*)['"]?/i,
      )
      if (filenameMatch?.[1]) {
        modelFileName = path.basename(filenameMatch[1])
      }
    }

    const modelFilePath = path.join(componentDir, modelFileName)
    const arrayBuffer = await response.arrayBuffer()
    await fs.writeFile(modelFilePath, Buffer.from(arrayBuffer))

    // Update TSX to use relative path (safer string replacement)
    const localModelPath = `./${modelFileName}`
    const urlPattern = objUrlMatch ? "objUrl" : "modelUrl"
    const oldUrlLine = remoteUrlMatch[0]
    const newUrlLine = `${urlPattern}: "${localModelPath}"`

    return tsxContent.replace(oldUrlLine, newUrlLine)
  } catch (error) {
    console.error("Error downloading 3D model:", error)
    return tsxContent
  }
}
