import type { Command } from "commander"
import path from "node:path"
import fs from "node:fs"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getEntrypoint } from "lib/shared/get-entrypoint"

export const registerBuild = (program: Command) => {
  program
    .command("build")
    .description("Run tscircuit eval and output circuit json")
    .argument("[file]", "Path to the entry file")
    .action(async (file?: string) => {
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
      } catch (err) {
        console.error(`Build failed: ${err}`)
        return process.exit(1)
      }
    })
}
