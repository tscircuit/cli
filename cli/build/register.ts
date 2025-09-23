import type { Command } from "commander"
import path from "node:path"
import fs from "node:fs"
import { buildFile } from "./build-file"
import { getBuildEntrypoints } from "./get-build-entrypoints"
import {
  getStaticIndexHtmlFile,
  type StaticBuildFileReference,
} from "lib/site/getStaticIndexHtmlFile"
import type { PlatformConfig } from "@tscircuit/props"

// @ts-ignore
import runFrameStandaloneBundleContent from "@tscircuit/runframe/standalone" with {
  type: "text",
}

export const registerBuild = (program: Command) => {
  program
    .command("build")
    .description("Run tscircuit eval and output circuit json")
    .argument("[file]", "Path to the entry file")
    .option("--ignore-errors", "Do not exit with code 1 on errors")
    .option("--ignore-warnings", "Do not log warnings")
    .option("--disable-pcb", "Disable PCB outputs")
    .option("--disable-parts-engine", "Disable the parts engine")
    .option("--site", "Generate a static site in the dist directory")
    .action(
      async (
        file?: string,
        options?: {
          ignoreErrors?: boolean
          ignoreWarnings?: boolean
          disablePcb?: boolean
          disablePartsEngine?: boolean
          site?: boolean
        },
      ) => {
        const { projectDir, circuitFiles } = await getBuildEntrypoints({
          fileOrDir: file,
        })

        const platformConfig: PlatformConfig | undefined = (() => {
          if (!options?.disablePcb && !options?.disablePartsEngine) return

          const config: PlatformConfig = {}

          if (options?.disablePcb) {
            config.pcbDisabled = true
          }

          if (options?.disablePartsEngine) {
            config.partsEngineDisabled = true
          }

          return config
        })()

        const distDir = path.join(projectDir, "dist")
        fs.mkdirSync(distDir, { recursive: true })

        let hasErrors = false
        const staticFileReferences: StaticBuildFileReference[] = []

        for (const filePath of circuitFiles) {
          const relative = path.relative(projectDir, filePath)
          const outputDirName = relative.replace(
            /(\.board|\.circuit)?\.tsx$/,
            "",
          )
          const outputPath = path.join(distDir, outputDirName, "circuit.json")
          const ok = await buildFile(filePath, outputPath, projectDir, {
            ignoreErrors: options?.ignoreErrors,
            ignoreWarnings: options?.ignoreWarnings,
            platformConfig,
          })
          if (!ok) {
            hasErrors = true
          } else if (options?.site) {
            const normalizedSourcePath = relative.split(path.sep).join("/")
            const relativeOutputPath = path.join(outputDirName, "circuit.json")
            const normalizedOutputPath = relativeOutputPath
              .split(path.sep)
              .join("/")
            staticFileReferences.push({
              filePath: normalizedSourcePath,
              fileStaticAssetUrl: `./${normalizedOutputPath}`,
            })
          }
        }

        if (hasErrors && !options?.ignoreErrors) {
          process.exit(1)
        }

        if (options?.site) {
          const indexHtml = getStaticIndexHtmlFile({
            files: staticFileReferences,
            standaloneScriptSrc: "./standalone.min.js",
          })
          fs.writeFileSync(path.join(distDir, "index.html"), indexHtml)
          fs.writeFileSync(
            path.join(distDir, "standalone.min.js"),
            runFrameStandaloneBundleContent,
          )
        }
      },
    )
}
