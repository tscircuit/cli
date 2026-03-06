import fs from "fs"
import path from "node:path"
import kleur from "kleur"

export const writeFileIfNotExists = (filePath: string, content: string) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content.trimStart(), "utf-8")
    const relativeFilePath = path.relative(process.cwd(), filePath) || filePath
    console.info(kleur.dim(`Created: ${kleur.gray(relativeFilePath)}`))
  } else {
    const relativeFilePath = path.relative(process.cwd(), filePath) || filePath
    console.info(
      kleur.dim(`Skipped: ${kleur.gray(relativeFilePath)} already exists`),
    )
  }
}
