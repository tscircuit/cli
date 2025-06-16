import path from "node:path"
import fs from "node:fs"
import kleur from "kleur"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { analyzeCircuitJson } from "lib/shared/circuit-json-diagnostics"

export const buildFile = async (
  input: string,
  output: string,
  projectDir: string,
  options?: { ignoreErrors?: boolean; ignoreWarnings?: boolean },
): Promise<boolean> => {
  try {
    const result = await generateCircuitJson({ filePath: input })
    fs.mkdirSync(path.dirname(output), { recursive: true })
    fs.writeFileSync(output, JSON.stringify(result.circuitJson, null, 2))
    console.log(`Circuit JSON written to ${path.relative(projectDir, output)}`)

    const { errors, warnings } = analyzeCircuitJson(result.circuitJson)

    if (!options?.ignoreWarnings) {
      for (const warn of warnings) {
        const msg = warn.message || JSON.stringify(warn)
        console.log(kleur.yellow(msg))
      }
    }

    if (!options?.ignoreErrors) {
      for (const err of errors) {
        const msg = err.message || JSON.stringify(err)
        console.error(kleur.red(msg))
      }
    }

    return errors.length === 0
  } catch (err) {
    console.error(`Build failed: ${err}`)
    return false
  }
}
