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
  const rawTsx = convertCircuitJsonToTscircuit(circuitJson, { componentName })
  const tsx = bindKicadReferenceText(rawTsx)
  const outputPath = output
    ? path.resolve(output)
    : path.join(path.dirname(inputPath), `${componentName}.tsx`)

  await fs.writeFile(outputPath, tsx)
  console.log(kleur.green(`Converted ${outputPath}`))
}

// KiCad footprints use the literal "REF**" as the placeholder text of the
// fp_text reference field. Bind that label to the component instance name so
// each placed instance prints its own reference designator instead of
// "REF**". Ordinary user text stays literal.
const bindKicadReferenceText = (tsx: string) => {
  // Only rewrite when the generated component has `props` in scope
  if (!tsx.includes("(props:")) return tsx
  return tsx.replaceAll(
    /(<silkscreentext\b[^>]*?)text="REF\*\*"/g,
    '$1text={props.name ?? "REF**"}',
  )
}
