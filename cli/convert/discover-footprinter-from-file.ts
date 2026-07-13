import { circuitJsonToFootprinter } from "circuit-json-to-footprinter"
import kleur from "kleur"
import fs from "node:fs/promises"
import path from "node:path"
import { loadCircuitJsonForFootprinter } from "./load-circuit-json-for-footprinter"

export const discoverFootprinterFromFile = async ({
  inputPath,
  json,
  output,
}: {
  inputPath: string
  json?: boolean
  output?: string
}) => {
  const circuitJson = await loadCircuitJsonForFootprinter(inputPath)
  const inputText = await fs.readFile(inputPath, "utf-8")
  const result = circuitJsonToFootprinter(circuitJson, {
    sourceHints: [path.basename(inputPath), inputText.slice(0, 20_000)],
  })
  if (!result.best) {
    throw new Error("No compatible footprinter string was found")
  }

  const resultText = json
    ? JSON.stringify(
        {
          best: result.best,
          candidates: result.candidates,
          diagnostics: result.diagnostics,
        },
        null,
        2,
      )
    : result.best.footprinterString
  if (output) {
    const outputPath = path.resolve(output)
    await fs.writeFile(outputPath, `${resultText}\n`)
    console.log(kleur.green(`Converted ${outputPath}`))
    return
  }

  console.log(resultText)
  if (!json) {
    console.log(
      kleur.dim(
        `Copper IoU: ${(result.best.copperIntersectionOverUnion * 100).toFixed(
          2,
        )}%`,
      ),
    )
  }
}
