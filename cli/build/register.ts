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
import type { BuildFileResult } from "./build-preview-images"
import { buildPreviewImages } from "./build-preview-images"
import { buildPreviewGltf } from "./build-preview-gltf"
import { generateKicadProject } from "./generate-kicad-project"
import type { GeneratedKicadProject } from "./generate-kicad-project"
import { generateKicadFootprintLibrary } from "./generate-kicad-footprint-library"
import { transpileFile } from "./transpile"
import { validateMainInDist } from "../utils/validate-main-in-dist"

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
    .option("--transpile", "Transpile the entry file to JavaScript")
    .option("--preview-images", "Generate preview images in the dist directory")
    .option(
      "--all-images",
      "Generate preview images for every successful build output",
    )
    .option(
      "--kicad",
      "Generate KiCad project directories for each successful build output",
    )
    .option(
      "--kicad-footprint-library",
      "Generate a KiCad footprint library from all successful build outputs",
    )
    .option(
      "--preview-gltf",
      "Generate a GLTF file from the preview entrypoint",
    )
    .action(
      async (
        file?: string,
        options?: {
          ignoreErrors?: boolean
          ignoreWarnings?: boolean
          disablePcb?: boolean
          disablePartsEngine?: boolean
          site?: boolean
          transpile?: boolean
          previewImages?: boolean
          allImages?: boolean
          kicad?: boolean
          kicadFootprintLibrary?: boolean
          previewGltf?: boolean
        },
      ) => {
        try {
          const {
            projectDir,
            circuitFiles,
            mainEntrypoint,
            previewComponentPath,
          } = await getBuildEntrypoints({
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

          console.log(`Building ${circuitFiles.length} file(s)...`)

          let hasErrors = false
          const staticFileReferences: StaticBuildFileReference[] = []

          const builtFiles: BuildFileResult[] = []
          const kicadProjects: Array<
            GeneratedKicadProject & { sourcePath: string }
          > = []

          const shouldGenerateKicad =
            options?.kicad || options?.kicadFootprintLibrary

          for (const filePath of circuitFiles) {
            const relative = path.relative(projectDir, filePath)
            console.log(`Building ${relative}...`)
            const outputDirName = relative.replace(
              /(\.board|\.circuit)?\.tsx$/,
              "",
            )
            const outputPath = path.join(distDir, outputDirName, "circuit.json")
            const buildOutcome = await buildFile(
              filePath,
              outputPath,
              projectDir,
              {
                ignoreErrors: options?.ignoreErrors,
                ignoreWarnings: options?.ignoreWarnings,
                platformConfig,
              },
            )
            builtFiles.push({
              sourcePath: filePath,
              outputPath,
              ok: buildOutcome.ok,
            })
            if (!buildOutcome.ok) {
              hasErrors = true
            } else if (options?.site) {
              const normalizedSourcePath = relative.split(path.sep).join("/")
              const relativeOutputPath = path.join(
                outputDirName,
                "circuit.json",
              )
              const normalizedOutputPath = relativeOutputPath
                .split(path.sep)
                .join("/")
              staticFileReferences.push({
                filePath: normalizedSourcePath,
                fileStaticAssetUrl: `./${normalizedOutputPath}`,
              })
            }

            if (
              buildOutcome.ok &&
              shouldGenerateKicad &&
              buildOutcome.circuitJson
            ) {
              const projectOutputDir = path.join(
                distDir,
                outputDirName,
                "kicad",
              )
              const projectName = path.basename(outputDirName)
              const project = await generateKicadProject({
                circuitJson: buildOutcome.circuitJson,
                outputDir: projectOutputDir,
                projectName,
                writeFiles: Boolean(options?.kicad),
              })
              kicadProjects.push({
                ...project,
                sourcePath: filePath,
              })
            }
          }

          if (hasErrors && !options?.ignoreErrors) {
            process.exit(1)
          }

          const shouldGeneratePreviewImages =
            options?.previewImages || options?.allImages

          if (shouldGeneratePreviewImages) {
            console.log(
              options?.allImages
                ? "Generating preview images for all builds..."
                : "Generating preview images...",
            )
            await buildPreviewImages({
              builtFiles,
              distDir,
              mainEntrypoint,
              previewComponentPath,
              allImages: options?.allImages,
            })
          }

          if (options?.previewGltf) {
            console.log("Generating preview GLTF...")
            await buildPreviewGltf({
              builtFiles,
              distDir,
              mainEntrypoint,
              previewComponentPath,
            })
          }

          if (options?.transpile) {
            validateMainInDist(projectDir, distDir)

            console.log("Transpiling entry file...")
            // For transpilation, we need to find the main library entrypoint
            // (not board files).
            const { mainEntrypoint: transpileEntrypoint } =
              await getBuildEntrypoints({
                fileOrDir: file,
                includeBoardFiles: false,
              })
            const entryFile = transpileEntrypoint
            if (!entryFile) {
              console.error(
                "No entry file found for transpilation. Make sure you have a lib/index.ts or set mainEntrypoint in tscircuit.config.json",
              )
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

          if (options?.kicadFootprintLibrary) {
            if (kicadProjects.length === 0) {
              console.warn(
                "No successful build output available for KiCad footprint library generation.",
              )
            } else {
              await generateKicadFootprintLibrary({
                projects: kicadProjects,
                distDir,
              })
            }
          }

          console.log("Build complete!")
          process.exit(0)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.error(message)
          process.exit(1)
        }
      },
    )
}
