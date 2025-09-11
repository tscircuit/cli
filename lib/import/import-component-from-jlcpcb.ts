import { fetchEasyEDAComponent, convertRawEasyToTsx } from "easyeda/browser"
import fs from "node:fs/promises"
import path from "node:path"

export const importComponentFromJlcpcb = async (
  jlcpcbPartNumber: string,
  projectDir: string = process.cwd(),
) => {
  const component = await fetchEasyEDAComponent(jlcpcbPartNumber)
  const tsx = await convertRawEasyToTsx(component)
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
