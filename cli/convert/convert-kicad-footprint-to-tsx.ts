import { convertCircuitJsonToTscircuit } from "circuit-json-to-tscircuit"
import kleur from "kleur"
import fs from "node:fs/promises"
import path from "node:path"
import { convertKicadFootprintToCircuitJson } from "./convert-kicad-footprint-to-circuit-json"

export const extractKicadFootprintReference = (
  modContent: string,
): string | null => {
  // Check KiCad 7+ property "Reference"
  const propMatch = modContent.match(
    /\(property\s+["']Reference["']\s+(?:"([^"]*)"|'([^']*)'|([^\s)]+))/i,
  )
  if (propMatch) return propMatch[1] ?? propMatch[2] ?? propMatch[3] ?? null

  // Check KiCad 5/6 fp_text reference
  const fpTextMatch = modContent.match(
    /\(fp_text\s+reference\s+(?:"([^"]*)"|'([^']*)'|([^\s)]+))/i,
  )
  if (fpTextMatch)
    return fpTextMatch[1] ?? fpTextMatch[2] ?? fpTextMatch[3] ?? null

  return null
}

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
  const extractedRef = extractKicadFootprintReference(modContent)
  const circuitJson = await convertKicadFootprintToCircuitJson(inputPath)

  const sourceComp = circuitJson.find(
    (el): el is { type: "source_component"; name?: string } =>
      el.type === "source_component",
  )
  const ref = extractedRef ?? sourceComp?.name ?? null

  if (ref && ref.trim() !== "") {
    const encodedRef = Buffer.from(ref, "utf-8").toString("hex")
    const placeholder = `__TSCIRCUIT_REF_PLACEHOLDER_${encodedRef}__`
    for (const element of circuitJson) {
      if (
        (element.type === "pcb_silkscreen_text" ||
          element.type === "pcb_fabrication_note_text") &&
        element.text === ref
      ) {
        element.text = placeholder
      }
    }
  }

  const componentName = name ?? path.basename(inputPath, ".kicad_mod")
  let tsx = convertCircuitJsonToTscircuit(circuitJson, { componentName })

  if (ref && ref.trim() !== "") {
    tsx = tsx.replace(
      /text="__TSCIRCUIT_REF_PLACEHOLDER_([0-9a-f]+)__"/g,
      (_, hex) => {
        const originalRef = Buffer.from(hex, "hex").toString("utf-8")
        const fallback = originalRef === "${REFERENCE}" ? "REF**" : originalRef
        return `text={props.name ?? ${JSON.stringify(fallback)}}`
      },
    )
  }

  const outputPath = output
    ? path.resolve(output)
    : path.join(path.dirname(inputPath), `${componentName}.tsx`)

  await fs.writeFile(outputPath, tsx)
  console.log(kleur.green(`Converted ${outputPath}`))

  return { tsx, outputPath }
}
