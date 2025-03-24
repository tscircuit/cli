import { JLCComponent } from "./types"
import { fetchEasyEDAComponent, convertRawEasyEdaToTs } from "easyeda"
import * as fs from "fs/promises"
import * as path from "path"

async function convertPartNumberToTsx(partNumber: string) {
  const rawEasyJson = await fetchEasyEDAComponent(partNumber)
  const tsxComponent = await convertRawEasyEdaToTs(rawEasyJson)
  return tsxComponent
}

export default async function importjlcpcbComponent(component: JLCComponent) {
  if (!component?.partNumber) {
    throw new Error("Invalid component or missing part number")
  }

  const tsxComponent = await convertPartNumberToTsx(component.partNumber)

  const importDir = path.join(process.cwd(), "imports")
  await fs.mkdir(importDir, { recursive: true })

  const filename = `${component.name.replace(/[^a-zA-Z0-9]/g, "_")}.tsx`
  const filePath = path.join(importDir, filename)

  await fs.writeFile(filePath, tsxComponent, "utf8")
  return filePath
}
