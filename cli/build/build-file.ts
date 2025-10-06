import path from "node:path"
import fs from "node:fs"
import kleur from "kleur"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { analyzeCircuitJson } from "lib/shared/circuit-json-diagnostics"
import type { PlatformConfig } from "@tscircuit/props"

export const buildFile = async (
  input: string,
  output: string,
  projectDir: string,
  options?: {
    ignoreErrors?: boolean
    ignoreWarnings?: boolean
    platformConfig?: PlatformConfig
  },
): Promise<boolean> => {
  try {
    const result = await generateCircuitJson({
      filePath: input,
      platformConfig: options?.platformConfig,
    })
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
        console.log(err.stack)
      }
    }

    if (errors.length > 0 && !options?.ignoreErrors) {
      console.error(
        kleur.red(
          `Build failed with ${errors.length} error(s). Use --ignore-errors to continue.`,
        ),
      )
      return false
    } else {
      return true
    }
  } catch (err) {
    console.error(`Build failed: ${err}`)
    return false
  }
}
