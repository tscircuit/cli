import { fetchEasyEDAComponent, convertRawEasyToTsx } from "easyeda/browser"
import fs from "node:fs/promises"
import path from "node:path"

export const importComponentFromJlcpcb = async ({
  jlcpcbPartNumber,
  projectDir = process.cwd(),
  modelFormat = "obj",
}: {
  jlcpcbPartNumber: string
  projectDir?: string
  modelFormat?: "obj" | "step"
}) => {
  const component = await fetchEasyEDAComponent(jlcpcbPartNumber)
  const tsx = await convertRawEasyToTsx({
    rawEasy: component,
    format: modelFormat,
  })
  const fileName = tsx.match(/export const (\w+) = .*/)?.[1]
  if (!fileName) {
    throw new Error("Could not determine file name of converted component")
  }
  const importsDir = path.join(projectDir, "imports")
  await fs.mkdir(importsDir, { recursive: true })
  const filePath = path.join(importsDir, `${fileName}.tsx`)
  await fs.writeFile(filePath, tsx)
  return { filePath }
}
