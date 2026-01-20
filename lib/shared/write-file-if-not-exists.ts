import fs from "fs"
import kleur from "kleur"

export const writeFileIfNotExists = (filePath: string, content: string) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content.trimStart(), "utf-8")
    console.info(kleur.dim(`Created: ${kleur.gray(filePath)}`))
  } else {
    console.info(kleur.dim(`Skipped: ${kleur.gray(filePath)} already exists`))
  }
}
