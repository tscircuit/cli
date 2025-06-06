import type { Command } from "commander"
import path from "node:path"
import fs from "node:fs"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import kleur from "kleur"
import { analyzeCircuitJson } from "lib/shared/circuit-json-diagnostics"

export const registerBuild = (program: Command) => {
  program
    .command("build")
    .description("Run tscircuit eval and output circuit json")
    .argument("[file]", "Path to the entry file")
    .option("--ignore-errors", "Do not exit with code 1 on errors")
    .option("--ignore-warnings", "Do not log warnings")
    .action(
      async (
        file?: string,
        options?: { ignoreErrors?: boolean; ignoreWarnings?: boolean },
      ) => {
        const entrypoint = await getEntrypoint({ filePath: file })
        if (!entrypoint) return process.exit(1)

        const projectDir = path.dirname(entrypoint)
        const distDir = path.join(projectDir, "dist")
        const outputPath = path.join(distDir, "circuit.json")

        fs.mkdirSync(distDir, { recursive: true })

        try {
          const result = await generateCircuitJson({ filePath: entrypoint })
          fs.writeFileSync(
            outputPath,
            JSON.stringify(result.circuitJson, null, 2),
          )
          console.log(
            `Circuit JSON written to ${path.relative(projectDir, outputPath)}`,
          )

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

          if (errors.length > 0 && !options?.ignoreErrors) {
            return process.exit(1)
          }
        } catch (err) {
          console.error(`Build failed: ${err}`)
          return process.exit(1)
        }
      },
    )
}
