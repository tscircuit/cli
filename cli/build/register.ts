import type { Command } from "commander"
import path from "node:path"
import fs from "node:fs"
import { buildFile } from "./build-file"
import { getBuildEntrypoints } from "./get-build-entrypoints"
import { getTscircuitVersionsMessage } from "lib/shared/get-tscircuit-versions"

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
        const { projectDir, mainEntrypoint, circuitFiles } =
          await getBuildEntrypoints({ fileOrDir: file })

        const distDir = path.join(projectDir, "dist")
        fs.mkdirSync(distDir, { recursive: true })

        let hasErrors = false

        if (mainEntrypoint) {
          const outputPath = path.join(distDir, "circuit.json")
          const ok = await buildFile(
            mainEntrypoint,
            outputPath,
            projectDir,
            options,
          )
          if (!ok) hasErrors = true
        }

        for (const filePath of circuitFiles) {
          const relative = path.relative(projectDir, filePath)
          const isCircuit = filePath.endsWith(".circuit.tsx")
          const outputPath = isCircuit
            ? path.join(
                distDir,
                relative.replace(/\.circuit\.tsx$/, ""),
                "circuit.json",
              )
            : path.join(distDir, "circuit.json")
          const ok = await buildFile(filePath, outputPath, projectDir, options)
          if (!ok) hasErrors = true
        }

        if (hasErrors && !options?.ignoreErrors) {
          console.error(getTscircuitVersionsMessage())
          process.exit(1)
        }
      },
    )
}
