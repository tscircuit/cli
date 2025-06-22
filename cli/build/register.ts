import type { Command } from "commander"
import path from "node:path"
import fs from "node:fs"
import { buildFile } from "./build-file"
import { getBuildEntrypoints } from "./get-build-entrypoints"
import type { PlatformConfig } from "@tscircuit/props"

export const registerBuild = (program: Command) => {
  program
    .command("build")
    .description("Run tscircuit eval and output circuit json")
    .argument("[file]", "Path to the entry file")
    .option("--ignore-errors", "Do not exit with code 1 on errors")
    .option("--ignore-warnings", "Do not log warnings")
    .option("--disable-pcb", "Disable PCB outputs")
    .action(
      async (
        file?: string,
        options?: {
          ignoreErrors?: boolean
          ignoreWarnings?: boolean
          disablePcb?: boolean
        },
      ) => {
        const { projectDir, mainEntrypoint, circuitFiles } =
          await getBuildEntrypoints({ fileOrDir: file })

        const platformConfig: PlatformConfig = {
          pcbDisabled: options?.disablePcb,
        }

        const distDir = path.join(projectDir, "dist")
        fs.mkdirSync(distDir, { recursive: true })

        let hasErrors = false

        if (mainEntrypoint) {
          const outputPath = path.join(distDir, "circuit.json")
          const ok = await buildFile(mainEntrypoint, outputPath, projectDir, {
            ...options,
            platformConfig,
          })
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
          process.exit(1)
        }
      },
    )
}
