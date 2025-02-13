import fs from "fs"

export const writeFileIfNotExists = (filePath: string, content: string) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content.trimStart(), "utf-8")
    console.info(`Created: ${filePath}`)
  } else {
    console.info(`Skipped: ${filePath} already exists`)
  }
}
