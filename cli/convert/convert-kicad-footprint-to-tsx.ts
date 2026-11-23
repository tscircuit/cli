import fs from "node:fs/promises"
import path from "node:path"
import { convertCircuitJsonToTscircuit } from "circuit-json-to-tscircuit"
import kleur from "kleur"
import { convertKicadFootprintContentToCircuitJson } from "./convert-kicad-footprint-to-circuit-json"
import {
  createReferenceTemplatedKicadMod,
  mergeReferenceTextTemplates,
  replaceReferenceSentinelInTsx,
} from "./preserve-kicad-reference-placeholders"

export const convertKicadFootprintToTsx = async ({
  inputPath,
  name,
  output,
}: {
  inputPath: string
  name?: string
  output?: string
}) => {
  const modContent = await fs.readFile(inputPath, "utf-8")
  const fileName = path.basename(inputPath)
  let circuitJson = convertKicadFootprintContentToCircuitJson(
    fileName,
    modContent,
  )
  const templated = createReferenceTemplatedKicadMod(modContent)
  if (templated.hasPlaceholders) {
    const templatedCircuitJson = convertKicadFootprintContentToCircuitJson(
      fileName,
      templated.content,
    )
    circuitJson = mergeReferenceTextTemplates(
      circuitJson,
      templatedCircuitJson,
      templated.sentinel,
    )
  }

  const componentName = name ?? path.basename(inputPath, ".kicad_mod")
  let tsx = convertCircuitJsonToTscircuit(circuitJson, { componentName })
  if (templated.hasPlaceholders) {
    tsx = replaceReferenceSentinelInTsx(tsx, templated.sentinel)
  }
  const outputPath = output
    ? path.resolve(output)
    : path.join(path.dirname(inputPath), `${componentName}.tsx`)

  await fs.writeFile(outputPath, tsx)
  console.log(kleur.green(`Converted ${outputPath}`))
}
