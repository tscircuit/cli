import type { Command } from "commander"
import path from "node:path"
import fs from "node:fs"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import kleur from "kleur"
import { analyzeCircuitJson } from "lib/shared/circuit-json-diagnostics"
import { globbySync } from "globby"
import { DEFAULT_IGNORED_PATTERNS } from "lib/shared/should-ignore-path"

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

        let projectDir = process.cwd()
        if (entrypoint) projectDir = path.dirname(entrypoint)

        const distDir = path.join(projectDir, "dist")
        fs.mkdirSync(distDir, { recursive: true })

        let hasErrors = false

        const buildFile = async (input: string, output: string) => {
          try {
            const result = await generateCircuitJson({ filePath: input })
            fs.mkdirSync(path.dirname(output), { recursive: true })
            fs.writeFileSync(
              output,
              JSON.stringify(result.circuitJson, null, 2),
            )
            console.log(
              `Circuit JSON written to ${path.relative(projectDir, output)}`,
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

            if (errors.length > 0) {
              hasErrors = true
            }
          } catch (err) {
            console.error(`Build failed: ${err}`)
            process.exit(1)
          }
        }

        if (entrypoint) {
          const outputPath = path.join(distDir, "circuit.json")
          await buildFile(entrypoint, outputPath)
        }

        const ignorePatterns = [...DEFAULT_IGNORED_PATTERNS]

        const circuitFiles = globbySync("**/*.circuit.tsx", {
          cwd: projectDir,
          ignore: ignorePatterns,
        })

        for (const filePath of circuitFiles) {
          const abs = path.join(projectDir, filePath)
          const outputPath = path.join(
            distDir,
            filePath.replace(/\.circuit\.tsx$/, ""),
            "circuit.json",
          )
          await buildFile(abs, outputPath)
        }

        if (hasErrors && !options?.ignoreErrors) {
          process.exit(1)
        }
      },
    )
}
