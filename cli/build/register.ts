import type { Command } from "commander"
import path from "node:path"
import fs from "node:fs"
import { buildFile } from "./build-file"
import { applyCiBuildOptions, type BuildCommandOptions } from "./build-ci"
import { resolveBuildOptions } from "./resolve-build-options"
import { getBuildEntrypoints } from "./get-build-entrypoints"
import { loadProjectConfig } from "lib/project-config"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import {
  getStaticIndexHtmlFile,
  type StaticBuildFileReference,
} from "lib/site/getStaticIndexHtmlFile"
import type { PlatformConfig } from "@tscircuit/props"
import type { BuildFileResult } from "./build-preview-images"
import { buildPreviewImages } from "./build-preview-images"
import { buildPreviewGltf } from "./build-preview-gltf"
import { buildGlbs } from "./build-glbs"
import { generateKicadProject } from "./generate-kicad-project"
import type { GeneratedKicadProject } from "./generate-kicad-project"
import { convertToKicadLibrary } from "lib/shared/convert-to-kicad-library"
import { buildKicadPcm } from "./build-kicad-pcm"
import { transpileFile } from "./transpile"
import { validateMainInDist } from "../utils/validate-main-in-dist"
import { resolveKicadLibraryName } from "lib/utils/resolve-kicad-library-name"
import { getLatestTscircuitCdnUrl } from "../utils/get-latest-tscircuit-cdn-url"
import { buildFilesWithWorkerPool } from "./worker-pool"
import type { BuildJobResult } from "./worker-types"
import kleur from "kleur"

// @ts-ignore
import runFrameStandaloneBundleContent from "@tscircuit/runframe/standalone" with {
  type: "text",
}

const normalizeRelativePath = (projectDir: string, targetPath: string) =>
  path.relative(projectDir, targetPath).split(path.sep).join("/")

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
    .option("--ignore-config", "Ignore options from tscircuit.config.json")
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
    .option("--kicad-library", "Generate KiCad library in dist/kicad-library")
    .option(
      "--preview-gltf",
      "Generate a GLTF file from the preview entrypoint",
    )
    .option("--glbs", "Generate GLB 3D model files for every successful build")
    .option(
      "--kicad-pcm",
      "Generate KiCad PCM (Plugin and Content Manager) assets in dist/pcm",
    )
    .option(
      "--use-cdn-javascript",
      "Use CDN-hosted JavaScript instead of bundled standalone file for --site",
    )
    .option(
      "--concurrency <number>",
      "Number of files to build in parallel (default: 1)",
      "1",
    )
    .action(async (file?: string, options?: BuildCommandOptions) => {
      try {
        // First, determine projectDir so we can run prebuild commands BEFORE scanning for files
        // This allows prebuild commands to generate files that will be included in the build
        const resolvedRoot = path.resolve(process.cwd())
        let projectDir: string
        if (file) {
          const resolved = path.resolve(resolvedRoot, file)
          if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
            projectDir = resolvedRoot
          } else {
            // Find project root by looking for package.json
            let currentDir = path.dirname(resolved)
            while (currentDir !== path.dirname(currentDir)) {
              if (fs.existsSync(path.join(currentDir, "package.json"))) {
                break
              }
              currentDir = path.dirname(currentDir)
            }
            // If no package.json found (we reached root), fall back to cwd
            projectDir = fs.existsSync(path.join(currentDir, "package.json"))
              ? currentDir
              : resolvedRoot
          }
        } else {
          projectDir = resolvedRoot
        }

        const projectConfig = loadProjectConfig(projectDir)

        const { options: optionsWithConfig, configAppliedOpts } =
          resolveBuildOptions({
            cliOptions: options,
            projectConfig,
          })

        const { resolvedOptions, handled } = await applyCiBuildOptions({
          projectDir,
          options: optionsWithConfig,
        })

        if (handled) {
          return
        }

        const {
          circuitFiles,
          mainEntrypoint,
          previewComponentPath,
          siteDefaultComponentPath,
        } = await getBuildEntrypoints({
          fileOrDir: file,
        })

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

        // Parse concurrency option
        const concurrencyValue = Math.max(
          1,
          Number.parseInt(resolvedOptions?.concurrency || "1", 10),
        )

        if (concurrencyValue > 1) {
          console.log(
            `Building ${circuitFiles.length} file(s) with concurrency ${concurrencyValue}...`,
          )
        } else {
          console.log(`Building ${circuitFiles.length} file(s)...`)
        }

        let hasErrors = false
        let hasFatalErrors = false
        const staticFileReferences: StaticBuildFileReference[] = []

        const builtFiles: BuildFileResult[] = []
        const kicadProjects: Array<
          GeneratedKicadProject & { sourcePath: string }
        > = []

        const shouldGenerateKicad =
          resolvedOptions?.kicad || resolvedOptions?.kicadLibrary

        // Prepare build options for reuse
        const buildOptions = {
          ignoreErrors: resolvedOptions?.ignoreErrors,
          ignoreWarnings: resolvedOptions?.ignoreWarnings,
          platformConfig,
        }

        // Helper function to process a single build result
        const processBuildResult = async (
          filePath: string,
          outputPath: string,
          buildOutcome: {
            ok: boolean
            circuitJson?: unknown[]
            isFatalError?: { errorType: string; message: string }
          },
        ) => {
          const relative = path.relative(projectDir, filePath)
          const outputDirName = relative.replace(
            /(\.board|\.circuit)?\.tsx$/,
            "",
          )

          builtFiles.push({
            sourcePath: filePath,
            outputPath,
            ok: buildOutcome.ok,
          })

          if (!buildOutcome.ok) {
            hasErrors = true
            if (buildOutcome.isFatalError) {
              hasFatalErrors = true
              console.error(
                kleur.red(
                  `Fatal error [${buildOutcome.isFatalError.errorType}]: ${buildOutcome.isFatalError.message}`,
                ),
              )
            }
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

          if (buildOutcome.ok && shouldGenerateKicad) {
            // Read circuit JSON from file if not provided (worker mode doesn't pass it through IPC)
            let circuitJson = buildOutcome.circuitJson
            if (!circuitJson && fs.existsSync(outputPath)) {
              circuitJson = JSON.parse(fs.readFileSync(outputPath, "utf-8"))
            }

            if (circuitJson) {
              const projectOutputDir = path.join(
                distDir,
                outputDirName,
                "kicad",
              )
              const projectName = path.basename(outputDirName)
              const project = await generateKicadProject({
                circuitJson,
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
        }

        // Sequential build function (used when concurrency is 1)
        const buildSequentially = async () => {
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
              buildOptions,
            )
            await processBuildResult(filePath, outputPath, buildOutcome)
          }
        }

        // Parallel build function (used when concurrency > 1)
        const buildWithWorkers = async () => {
          const filesToBuild = circuitFiles.map((filePath) => {
            const relative = path.relative(projectDir, filePath)
            const outputDirName = relative.replace(
              /(\.board|\.circuit)?\.tsx$/,
              "",
            )
            const outputPath = path.join(distDir, outputDirName, "circuit.json")
            return { filePath, outputPath }
          })

          await buildFilesWithWorkerPool({
            files: filesToBuild,
            projectDir,
            concurrency: concurrencyValue,
            buildOptions,
            onLog: (lines) => {
              for (const line of lines) {
                console.log(line)
              }
            },
            onJobComplete: async (result: BuildJobResult) => {
              const relative = path.relative(projectDir, result.filePath)
              if (result.ok) {
                console.log(kleur.green(`✓ ${relative}`))
              } else {
                console.log(kleur.red(`✗ ${relative}`))
                for (const error of result.errors) {
                  console.error(kleur.red(`  ${error}`))
                }
              }

              // circuitJson is not passed through IPC - processBuildResult reads from file if needed
              await processBuildResult(result.filePath, result.outputPath, {
                ok: result.ok,
                isFatalError: result.isFatalError,
              })
            },
          })
        }

        if (concurrencyValue > 1) {
          await buildWithWorkers()
        } else {
          await buildSequentially()
        }

        // Fatal errors (e.g., circuit generation exceptions) always cause exit code 1
        // Non-fatal errors can be suppressed with --ignore-errors
        if (hasFatalErrors || (hasErrors && !resolvedOptions?.ignoreErrors)) {
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

        if (resolvedOptions?.glbs) {
          console.log("Generating GLB models for all builds...")
          await buildGlbs({
            builtFiles,
            distDir,
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
          const pkgJsonPath = path.join(projectDir, "package.json")
          const packageName = fs.existsSync(pkgJsonPath)
            ? JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")).name
            : undefined
          const indexHtml = getStaticIndexHtmlFile({
            files: staticFileReferences,
            standaloneScriptSrc,
            defaultMainComponentPath: siteDefaultComponentPath
              ? normalizeRelativePath(projectDir, siteDefaultComponentPath)
              : undefined,
            packageName: packageName || path.basename(projectDir),
          })
          fs.writeFileSync(path.join(distDir, "index.html"), indexHtml)
        }

        if (resolvedOptions?.kicadLibrary) {
          console.log("Generating KiCad library...")
          // Find the main library entrypoint for KiCad library generation
          const { mainEntrypoint: kicadEntrypoint } = await getBuildEntrypoints(
            {
              fileOrDir: file,
              includeBoardFiles: false,
            },
          )
          const projectConfig = loadProjectConfig(projectDir)
          const entryFile =
            projectConfig?.kicadLibraryEntrypointPath != null
              ? await getEntrypoint({
                  filePath: projectConfig.kicadLibraryEntrypointPath,
                  projectDir,
                })
              : kicadEntrypoint
          if (!entryFile) {
            console.error(
              "No entry file found for KiCad library generation. Make sure you have a lib/index.ts or set mainEntrypoint/kicadLibraryEntrypointPath in tscircuit.config.json",
            )
            if (!resolvedOptions?.ignoreErrors) {
              process.exit(1)
            }
          } else {
            const libraryName = resolveKicadLibraryName({ projectDir })
            const kicadLibOutputDir = path.join(distDir, "kicad-library")
            try {
              await convertToKicadLibrary({
                filePath: entryFile,
                libraryName,
                outputDir: kicadLibOutputDir,
              })
              console.log(
                `  KiCad library generated at ${kleur.dim(path.relative(process.cwd(), kicadLibOutputDir))}`,
              )
            } catch (err) {
              console.error(
                `Error generating KiCad library: ${err instanceof Error ? err.message : err}`,
              )
              if (!resolvedOptions?.ignoreErrors) {
                process.exit(1)
              }
            }
          }
        }

        if (resolvedOptions?.kicadPcm) {
          console.log("Generating KiCad PCM assets...")
          const { mainEntrypoint: kicadEntrypoint } = await getBuildEntrypoints(
            {
              fileOrDir: file,
              includeBoardFiles: false,
            },
          )

          const projectConfig = loadProjectConfig(projectDir)
          const entryFile =
            projectConfig?.kicadLibraryEntrypointPath != null
              ? await getEntrypoint({
                  filePath: projectConfig.kicadLibraryEntrypointPath,
                  projectDir,
                })
              : kicadEntrypoint

          if (!entryFile) {
            console.error(
              "No entry file found for KiCad PCM generation. Make sure you have a lib/index.ts or set mainEntrypoint/kicadLibraryEntrypointPath in tscircuit.config.json",
            )
            if (!resolvedOptions?.ignoreErrors) {
              process.exit(1)
            }
          } else {
            try {
              await buildKicadPcm({
                entryFile,
                projectDir,
                distDir,
              })
            } catch (err) {
              console.error(
                `Error generating KiCad PCM assets: ${err instanceof Error ? err.message : err}`,
              )
              if (!resolvedOptions?.ignoreErrors) {
                process.exit(1)
              }
            }
          }
        }

        const successCount = builtFiles.filter((f) => f.ok).length
        const failCount = builtFiles.length - successCount
        const enabledOpts = [
          resolvedOptions?.site && "site",
          resolvedOptions?.transpile && "transpile",
          resolvedOptions?.previewImages && "preview-images",
          resolvedOptions?.allImages && "all-images",
          resolvedOptions?.glbs && "glbs",
          resolvedOptions?.kicad && "kicad",
          resolvedOptions?.kicadLibrary && "kicad-library",
          resolvedOptions?.kicadPcm && "kicad-pcm",
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
        if (configAppliedOpts.length > 0) {
          console.log(
            `  Config    ${kleur.magenta(configAppliedOpts.join(", "))} ${kleur.dim("(from tscircuit.config.json)")}`,
          )
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
