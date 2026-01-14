import type { Command } from "commander"
import path from "node:path"
import fs from "node:fs"
import { buildFile } from "./build-file"
import { applyCiBuildOptions, type BuildCommandOptions } from "./build-ci"
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
import { transpileFile } from "./transpile"
import { validateMainInDist } from "../utils/validate-main-in-dist"
import { getLatestTscircuitCdnUrl } from "../utils/get-latest-tscircuit-cdn-url"
import kleur from "kleur"

// @ts-ignore
import runFrameStandaloneBundleContent from "@tscircuit/runframe/standalone" with {
  type: "text",
}

export const registerBuild = (program: Command) => {
  program
    .command("build")
    .description("Run tscircuit eval and output circuit json")
    .argument("[file]", "Path to the entry file")
    .option(
      "--ci",
      "Run install and optional prebuild/build commands (or default CI build)",
    )
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
      "--preview-gltf",
      "Generate a GLTF file from the preview entrypoint",
    )
    .option(
      "--use-cdn-javascript",
      "Use CDN-hosted JavaScript instead of bundled standalone file for --site",
    )
    .action(async (file?: string, options?: BuildCommandOptions) => {
      try {
        const {
          projectDir,
          circuitFiles,
          mainEntrypoint,
          previewComponentPath,
        } = await getBuildEntrypoints({
          fileOrDir: file,
        })

        const { resolvedOptions, handled } = await applyCiBuildOptions({
          projectDir,
          options,
        })

        if (handled) {
          return
        }

        const platformConfig: PlatformConfig | undefined = (() => {
          if (
            !resolvedOptions?.disablePcb &&
            !resolvedOptions?.disablePartsEngine
          ) {
            return
          }

          const config: PlatformConfig = {}

          if (resolvedOptions?.disablePcb) {
            config.pcbDisabled = true
          }

          if (resolvedOptions?.disablePartsEngine) {
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
          resolvedOptions?.kicad || resolvedOptions?.kicadFootprintLibrary

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
              ignoreErrors: resolvedOptions?.ignoreErrors,
              ignoreWarnings: resolvedOptions?.ignoreWarnings,
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
          } else if (resolvedOptions?.site) {
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

          if (
            buildOutcome.ok &&
            shouldGenerateKicad &&
            buildOutcome.circuitJson
          ) {
            const projectOutputDir = path.join(distDir, outputDirName, "kicad")
            const projectName = path.basename(outputDirName)
            const project = await generateKicadProject({
              circuitJson: buildOutcome.circuitJson,
              outputDir: projectOutputDir,
              projectName,
              writeFiles: Boolean(resolvedOptions?.kicad),
            })
            kicadProjects.push({
              ...project,
              sourcePath: filePath,
            })
          }
        }

        const allFailed =
          builtFiles.length > 0 && builtFiles.every((f) => !f.ok)
        if (allFailed && !resolvedOptions?.ignoreErrors) {
          console.error("All circuits failed to build")
          process.exit(1)
        }

        const shouldGeneratePreviewImages =
          resolvedOptions?.previewImages || resolvedOptions?.allImages

        if (shouldGeneratePreviewImages) {
          console.log(
            resolvedOptions?.allImages
              ? "Generating preview images for all builds..."
              : "Generating preview images...",
          )
          await buildPreviewImages({
            builtFiles,
            distDir,
            mainEntrypoint,
            previewComponentPath,
            allImages: resolvedOptions?.allImages,
          })
        }

        if (resolvedOptions?.previewGltf) {
          console.log("Generating preview GLTF...")
          await buildPreviewGltf({
            builtFiles,
            distDir,
            mainEntrypoint,
            previewComponentPath,
          })
        }

        if (resolvedOptions?.transpile) {
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

        if (resolvedOptions?.site) {
          let standaloneScriptSrc = "./standalone.min.js"
          if (resolvedOptions?.useCdnJavascript) {
            standaloneScriptSrc = await getLatestTscircuitCdnUrl()
          } else {
            fs.writeFileSync(
              path.join(distDir, "standalone.min.js"),
              runFrameStandaloneBundleContent,
            )
          }
          const indexHtml = getStaticIndexHtmlFile({
            files: staticFileReferences,
            standaloneScriptSrc,
          })
          fs.writeFileSync(path.join(distDir, "index.html"), indexHtml)
        }

        const successCount = builtFiles.filter((f) => f.ok).length
        const failCount = builtFiles.length - successCount
        const enabledOpts = [
          resolvedOptions?.site && "site",
          resolvedOptions?.transpile && "transpile",
          resolvedOptions?.previewImages && "preview-images",
          resolvedOptions?.allImages && "all-images",
          resolvedOptions?.kicad && "kicad",
          resolvedOptions?.previewGltf && "preview-gltf",
        ].filter(Boolean) as string[]

        console.log("")
        console.log(kleur.bold("Build complete"))
        console.log(
          `  Circuits  ${kleur.green(`${successCount} passed`)}${failCount > 0 ? kleur.red(` ${failCount} failed`) : ""}`,
        )
        if (enabledOpts.length > 0) {
          console.log(`  Options   ${kleur.cyan(enabledOpts.join(", "))}`)
        }
        console.log(
          `  Output    ${kleur.dim(path.relative(process.cwd(), distDir) || "dist")}`,
        )
        console.log(
          hasErrors
            ? kleur.yellow("\n⚠ Build completed with errors")
            : kleur.green("\n✓ Done"),
        )
        process.exit(0)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(message)
        process.exit(1)
      }
    })
}
