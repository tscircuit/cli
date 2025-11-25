import type { Command } from "commander"
import fs from "node:fs"
import path from "node:path"
import { transpileFile } from "../build/transpile/index"
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

        const packageJsonPath = path.join(projectDir, "package.json")
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, "utf-8"),
          )

          if (typeof packageJson.main === "string") {
            const resolvedMainPath = path.resolve(projectDir, packageJson.main)
            const isMainInDist =
              resolvedMainPath === distDir ||
              resolvedMainPath.startsWith(`${distDir}${path.sep}`)

            if (!isMainInDist) {
              throw new Error(
                'When using transpilation, your package\'s "main" field should point inside the `dist/*` directory, usually to "dist/index.js"',
              )
            }
          }
        }

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
