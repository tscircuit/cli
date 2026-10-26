import fs from "node:fs/promises"
import path from "node:path"
import type { BuildFileResult } from "./build-preview-images"
import {
  getDrawingPages,
  renderDrawingPages,
} from "lib/shared/render-drawing-pages"

export const buildDrawings = async ({
  builtFiles,
  drawing,
}: {
  builtFiles: BuildFileResult[]
  drawing?: string
}) => {
  let matched = false
  for (const build of builtFiles.filter((file) => file.ok)) {
    const circuitJson = JSON.parse(await fs.readFile(build.outputPath, "utf8"))
    if (
      drawing &&
      !getDrawingPages(circuitJson).some(
        ({ page, fileName }) => page.name === drawing || fileName === drawing,
      )
    )
      continue
    const pages = await renderDrawingPages(circuitJson, drawing)
    matched ||= pages.length > 0
    const outputDir = path.join(path.dirname(build.outputPath), "drawings")
    if (pages.length) await fs.mkdir(outputDir, { recursive: true })
    for (const { fileName, svg } of pages) {
      const destination = path.join(outputDir, fileName)
      await fs.writeFile(destination, svg)
      console.log(`Written ${destination}`)
    }
  }
  if (drawing && !matched)
    throw new Error(`Drawing "${drawing}" not found in successful builds.`)
}
