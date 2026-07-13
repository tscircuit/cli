import { convertCircuitJsonToTscircuit } from "circuit-json-to-tscircuit"
import kleur from "kleur"
import fs from "node:fs/promises"
import path from "node:path"
import { convertKicadFootprintToCircuitJson } from "./convert-kicad-footprint-to-circuit-json"

export const convertKicadFootprintToTsx = async ({
  inputPath,
  name,
  output,
}: {
  inputPath: string
  name?: string
  output?: string
}) => {
  const circuitJson = await convertKicadFootprintToCircuitJson(inputPath)
  const componentName = name ?? path.basename(inputPath, ".kicad_mod")
  const tsx = convertCircuitJsonToTscircuit(circuitJson, { componentName })
  const outputPath = output
    ? path.resolve(output)
    : path.join(path.dirname(inputPath), `${componentName}.tsx`)

  await fs.writeFile(outputPath, tsx)
  console.log(kleur.green(`Converted ${outputPath}`))
}
