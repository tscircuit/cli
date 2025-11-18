import type { Command } from "commander"
import path from "node:path"
import { transpileFile } from "../build/transpile"
import { getBuildEntrypoints } from "../build/get-build-entrypoints"

export const registerTranspile = (program: Command) => {
  program
    .command("transpile")
    .description(
      "Transpile TypeScript/TSX to JavaScript (ESM, CommonJS, and type declarations)",
    )
    .argument("[file]", "Path to the entry file")
    .action(async (file?: string) => {
      try {
        const { projectDir, circuitFiles, mainEntrypoint } =
          await getBuildEntrypoints({
            fileOrDir: file,
          })

        const distDir = path.join(projectDir, "dist")

        console.log("Transpiling entry file...")
        const entryFile = mainEntrypoint || circuitFiles[0]
        if (!entryFile) {
          console.error("No entry file found for transpilation")
          process.exit(1)
        }

        const transpileSuccess = await transpileFile({
          input: entryFile,
          outputDir: distDir,
          projectDir,
        })

        if (!transpileSuccess) {
          console.error("Transpilation failed")
          process.exit(1)
        }

        console.log("Transpile complete!")
        process.exit(0)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(message)
        process.exit(1)
      }
    })
}
