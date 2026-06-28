import fs from "node:fs"
import path from "node:path"
import JSZip from "jszip"
import type { PlatformConfig } from "@tscircuit/props"
import type { Command } from "commander"
import kleur from "kleur"
import { loadRuntimeProjectConfig } from "lib/project-config"
import type { CircuitJsonIssueCategory } from "lib/shared/circuit-json-diagnostics"
import { convertToKicadLibrary } from "lib/shared/convert-to-kicad-library"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import { mergePlatformConfigs } from "lib/shared/platform-config-utils"
import {
  type StaticBuildFileReference,
  getStaticIndexHtmlFile,
} from "lib/site/getStaticIndexHtmlFile"
import { resolveKicadLibraryName } from "lib/utils/resolve-kicad-library-name"
import { getLatestTscircuitCdnUrl } from "../utils/get-latest-tscircuit-cdn-url"
import { validateMainInDist } from "../utils/validate-main-in-dist"
import { type BuildCommandOptions, applyCiBuildOptions } from "./build-ci"
import { buildFile } from "./build-file"
import { buildGlbs } from "./build-glbs"
import { buildKicadPcm } from "./build-kicad-pcm"
import { buildStepFiles } from "./build-step-files"
import { buildPreviewGltf } from "./build-preview-gltf"
import type { BuildFileResult } from "./build-preview-images"
import { buildPreviewImages } from "./build-preview-images"
import {
  type DrcIgnoreCounts,
  formatIgnoredDrcCounts,
} from "./drc-diagnostic-filter"
import { generateKicadProject } from "./generate-kicad-project"
import type { GeneratedKicadProject } from "./generate-kicad-project"
import {
  BuildNoMatchingFilesError,
  getBuildEntrypoints,
} from "./get-build-entrypoints"
import {
  hasAnyImageFormatSelected,
  resolveImageFormatSelection,
} from "./image-format-selection"
import { resolveBuildOptions } from "./resolve-build-options"
import { transpileFile } from "./transpile"
import { exitBuild } from "./utils/exit-build"
import { buildFilesWithWorkerPool } from "./worker-pool"
import type { BuildJobResult } from "./worker-types"

// @ts-ignore
import runFrameStandaloneBundleContent from "@tscircuit/runframe/standalone" with {
  type: "text",
}

const normalizeRelativePath = (projectDir: string, targetPath: string) =>
  path.relative(projectDir, targetPath).split(path.sep).join("/")

const parseInjectedProps = ({
  injectProps,
  injectPropsFile,
  projectDir,
}: {
  injectProps?: string
  injectPropsFile?: string
  projectDir: string
}): Record<string, unknown> | undefined => {
  if (injectProps && injectPropsFile) {
    throw new Error(
      "Cannot use --inject-props and --inject-props-file together",
    )
  }

  const rawProps = (() => {
    if (injectPropsFile) {
      const resolvedPropsPath = path.resolve(projectDir, injectPropsFile)
      return fs.readFileSync(resolvedPropsPath, "utf-8")
    }

    return injectProps
  })()

  if (!rawProps) {
    return undefined
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawProps)
  } catch (error) {
    throw new Error(
      `Failed to parse injected props JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Injected props must be a JSON object")
  }

  return parsed as Record<string, unknown>
}

const getOutputDirName = (relativePath: string) => {
  const normalizedRelativePath = relativePath
    .toLowerCase()
    .replaceAll("\\", "/")

  if (
    normalizedRelativePath === "circuit.json" ||
    normalizedRelativePath.endsWith("/circuit.json")
  ) {
    return path.dirname(relativePath)
  }

  return relativePath
    .replace(/(\.board|\.circuit)?\.tsx$/, "")
    .replace(/\.circuit\.json$/, "")
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
    .option(
      "--status",
      "Print a summary of build errors and warnings without generating artifacts",
    )
    .option("--ignore-netlist-drc", "Ignore netlist DRC errors/warnings")
    .option(
      "--ignore-pin-specification-drc",
      "Ignore pin-specification DRC errors/warnings",
    )
    .option("--ignore-placement-drc", "Ignore placement DRC errors/warnings")
    .option("--ignore-routing-drc", "Ignore routing DRC errors/warnings")
    .option("--ignore-config", "Ignore options from tscircuit.config.json")
    .option("--disable-pcb", "Disable PCB outputs")
    .option("--routing-disabled", "Disable routing during circuit generation")
    .option("--disable-parts-engine", "Disable the parts engine")
    .option("--site", "Generate a static site in the dist directory")
    .option("--transpile", "Transpile the entry file to JavaScript")
    .option("--preview-images", "Generate preview images in the dist directory")
    .option(
      "--all-images",
      "Generate preview images for every successful build output",
    )
    .option("--pngs", "Generate PNG outputs during build generation")
    .option("--pcb-png", "Generate PCB PNG outputs during build generation")
    .option("--svgs", "Generate SVG outputs during build generation")
    .option("--pcb-svgs", "Generate PCB SVG outputs during build generation")
    .option(
      "--schematic-svgs",
      "Generate schematic SVG outputs during build generation",
    )
    .option(
      "--simulation-svgs",
      "Generate simulation graph SVG outputs during build generation",
    )
    .option(
      "--simulation-schematic-svgs",
      "Generate schematic simulation SVG outputs during build generation",
    )
    .option("--3d-png", "Generate 3D PNG outputs during build generation")
    .option("--3d", "Generate 3D PNG outputs during build generation")
    .option(
      "--pcb-only",
      "Generate only PCB SVG outputs during build generation",
    )
    .option(
      "--schematic-only",
      "Generate only schematic SVG outputs during build generation",
    )
    .option(
      "--kicad-project",
      "Generate KiCad project directories for each successful build output",
    )
    .option(
      "--kicad-project-zip",
      "Generate a zipped KiCad project for each successful build output",
    )
    .option("--kicad-library", "Generate KiCad library in dist/kicad-library")
    .option(
      "--kicad-library-name <name>",
      "Specify the name of the KiCad library",
    )
    .option(
      "--preview-gltf",
      "Generate a GLTF file from the preview entrypoint",
    )
    .option("--show-courtyards", "Show courtyard outlines in PCB SVG outputs")
    .option("--glbs", "Generate GLB 3D model files for every successful build")
    .option("--step", "Generate STEP 3D model files for every successful build")
    .option(
      "--profile",
      "Log per-circuit circuit.json generation time during build",
    )
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
    .option(
      "--inject-props <json>",
      "Inject JSON props into the built file's default export",
    )
    .option(
      "--inject-props-file <path>",
      "Inject JSON props from a file into the built file's default export",
    )
    .action(async (file?: string, options?: BuildCommandOptions) => {
      try {
        const transpileExplicitlyRequested = options?.transpile === true
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

        const projectConfig = await loadRuntimeProjectConfig(projectDir)

        const { options: optionsWithConfig, configAppliedOpts } =
          resolveBuildOptions({
            cliOptions: options,
            projectConfig,
          })

        const { resolvedOptions, handled } = await applyCiBuildOptions({
          projectDir,
          options: optionsWithConfig,
        })
        const statusMode = Boolean(resolvedOptions?.status)

        if (handled) {
          return
        }

        // When --kicad-project is used without a file argument and kicadProjectEntrypointPath is set,
        // use that as the file to build
        let fileOrDirForBuild = file
        if (
          !file &&
          resolvedOptions?.kicadProject &&
          projectConfig?.kicadProjectEntrypointPath
        ) {
          fileOrDirForBuild = projectConfig.kicadProjectEntrypointPath
        }

        const {
          circuitFiles,
          mainEntrypoint,
          previewComponentPath,
          siteDefaultComponentPath,
        } = await getBuildEntrypoints({
          fileOrDir: fileOrDirForBuild,
        })

        const commandPlatformConfig: PlatformConfig | undefined = (() => {
          if (
            !resolvedOptions?.disablePcb &&
            !resolvedOptions?.routingDisabled &&
            !resolvedOptions?.disablePartsEngine
          ) {
            return
          }

          const config: PlatformConfig = {}

          if (resolvedOptions?.disablePcb) {
            config.pcbDisabled = true
          }

          if (resolvedOptions?.routingDisabled) {
            config.routingDisabled = true
          }

          if (resolvedOptions?.disablePartsEngine) {
            config.partsEngineDisabled = true
          }

          return config
        })()

        const platformConfig = mergePlatformConfigs(
          projectConfig?.platformConfig,
          commandPlatformConfig,
        )

        const distDir = path.join(projectDir, "dist")
        if (!statusMode) {
          fs.mkdirSync(distDir, { recursive: true })
        }

        // Parse concurrency option
        const concurrencyValue = Math.max(
          1,
          Number.parseInt(resolvedOptions?.concurrency || "1", 10),
        )
        const effectiveConcurrencyValue = statusMode ? 1 : concurrencyValue

        if (effectiveConcurrencyValue > 1) {
          console.log(
            `Building ${circuitFiles.length} file(s) with concurrency ${effectiveConcurrencyValue}...`,
          )
        } else {
          console.log(`Building ${circuitFiles.length} file(s)...`)
        }

        let hasErrors = false
        let hasFatalErrors = false
        const ignoredDrcByCategory: DrcIgnoreCounts = {
          netlist: 0,
          pin_specification: 0,
          placement: 0,
          routing: 0,
          unknown: 0,
        }
        const staticFileReferences: StaticBuildFileReference[] = []
        const statusIssues: Array<{
          filePath: string
          severity: "error" | "warning"
          message: string
          category: CircuitJsonIssueCategory
        }> = []

        const builtFiles: BuildFileResult[] = []
        const kicadProjects: Array<
          GeneratedKicadProject & { sourcePath: string }
        > = []
        const profileEntries: Array<{ filePath: string; durationMs: number }> =
          []

        const shouldGenerateKicadProject =
          !statusMode &&
          (resolvedOptions?.kicadProject ||
            resolvedOptions?.kicadProjectZip ||
            resolvedOptions?.kicadLibrary)

        const injectedProps = parseInjectedProps({
          injectProps: resolvedOptions?.injectProps,
          injectPropsFile: resolvedOptions?.injectPropsFile,
          projectDir,
        })

        // Prepare build options for reuse
        const {
          selection: imageFormatSelection,
          hasExplicitSelection: hasExplicitImageFormatSelection,
        } = resolveImageFormatSelection(resolvedOptions)

        const buildOptions = {
          ignoreErrors: resolvedOptions?.ignoreErrors,
          ignoreWarnings: resolvedOptions?.ignoreWarnings,
          ignoreNetlistDrc: resolvedOptions?.ignoreNetlistDrc,
          ignorePinSpecificationDrc: resolvedOptions?.ignorePinSpecificationDrc,
          ignorePlacementDrc: resolvedOptions?.ignorePlacementDrc,
          ignoreRoutingDrc: resolvedOptions?.ignoreRoutingDrc,
          platformConfig,
          profile: resolvedOptions?.profile,
          injectedProps,
          generatePreviewAssets: false,
          writeOutput: !statusMode,
          logDiagnostics: !statusMode,
          imageFormats: imageFormatSelection,
          pcbSnapshotSettings: resolvedOptions?.showCourtyards
            ? { ...projectConfig?.pcbSnapshotSettings, showCourtyards: true }
            : projectConfig?.pcbSnapshotSettings,
        }

        const shouldGeneratePreviewImages = Boolean(
          !statusMode &&
            (resolvedOptions?.previewImages ||
              resolvedOptions?.allImages ||
              hasExplicitImageFormatSelection) &&
            hasAnyImageFormatSelected(imageFormatSelection),
        )
        const shouldGenerateAllPreviewImages = Boolean(
          resolvedOptions?.allImages,
        )
        const shouldGeneratePreviewAssetsInWorker = Boolean(
          resolvedOptions?.ci &&
            concurrencyValue > 1 &&
            shouldGeneratePreviewImages,
        )
        buildOptions.generatePreviewAssets = shouldGeneratePreviewAssetsInWorker

        const previewEntrypointForWorker =
          previewComponentPath || mainEntrypoint
        const resolvedPreviewEntrypointForWorker = previewEntrypointForWorker
          ? path.resolve(previewEntrypointForWorker)
          : undefined

        // Helper function to process a single build result
        const processBuildResult = async (
          filePath: string,
          outputPath: string,
          buildOutcome: {
            ok: boolean
            circuitJson?: unknown[]
            hasErrors?: boolean
            ignoredDrcByCategory?: DrcIgnoreCounts
            isFatalError?: { errorType: string; message: string }
            errors?: string[]
            warnings?: string[]
            errorDiagnostics?: Array<{
              message: string
              category: CircuitJsonIssueCategory
            }>
            warningDiagnostics?: Array<{
              message: string
              category: CircuitJsonIssueCategory
            }>
          },
        ) => {
          const relative = path.relative(projectDir, filePath)
          const outputDirName = getOutputDirName(relative)

          builtFiles.push({
            sourcePath: filePath,
            outputPath,
            ok: buildOutcome.ok,
          })

          if (buildOutcome.hasErrors) {
            hasErrors = true
          }
          const errorDiagnostics =
            buildOutcome.errorDiagnostics ??
            (buildOutcome.errors ?? []).map((message) => ({
              message,
              category: "unknown" as const,
            }))
          const warningDiagnostics =
            buildOutcome.warningDiagnostics ??
            (buildOutcome.warnings ?? []).map((message) => ({
              message,
              category: "unknown" as const,
            }))
          for (const error of errorDiagnostics) {
            statusIssues.push({
              filePath: relative,
              severity: "error",
              message: error.message,
              category: error.category,
            })
          }
          for (const warning of warningDiagnostics) {
            statusIssues.push({
              filePath: relative,
              severity: "warning",
              message: warning.message,
              category: warning.category,
            })
          }
          if (buildOutcome.ignoredDrcByCategory) {
            ignoredDrcByCategory.netlist +=
              buildOutcome.ignoredDrcByCategory.netlist
            ignoredDrcByCategory.pin_specification +=
              buildOutcome.ignoredDrcByCategory.pin_specification
            ignoredDrcByCategory.placement +=
              buildOutcome.ignoredDrcByCategory.placement
            ignoredDrcByCategory.routing +=
              buildOutcome.ignoredDrcByCategory.routing
            ignoredDrcByCategory.unknown +=
              buildOutcome.ignoredDrcByCategory.unknown
          }

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

          if (buildOutcome.ok && shouldGenerateKicadProject) {
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
              const shouldWriteKicadFiles = Boolean(
                resolvedOptions?.kicadProject ||
                  resolvedOptions?.kicadProjectZip,
              )
              const project = await generateKicadProject({
                circuitJson,
                outputDir: projectOutputDir,
                projectName,
                writeFiles: shouldWriteKicadFiles,
                platformConfig,
              })
              kicadProjects.push({
                ...project,
                sourcePath: filePath,
              })

              if (resolvedOptions?.kicadProjectZip && shouldWriteKicadFiles) {
                const zip = new JSZip()
                const addDirToZip = (dirPath: string, zipFolder: JSZip) => {
                  for (const entry of fs.readdirSync(dirPath)) {
                    const fullPath = path.join(dirPath, entry)
                    if (fs.statSync(fullPath).isDirectory()) {
                      addDirToZip(fullPath, zipFolder.folder(entry)!)
                    } else {
                      zipFolder.file(entry, fs.readFileSync(fullPath))
                    }
                  }
                }
                addDirToZip(projectOutputDir, zip)
                const zipBuffer = await zip.generateAsync({
                  type: "nodebuffer",
                })
                const zipPath = path.join(
                  distDir,
                  outputDirName,
                  `${projectName}-kicad.zip`,
                )
                fs.writeFileSync(zipPath, zipBuffer)
                console.log(
                  kleur.green(
                    `  KiCad zip: ${path.relative(process.cwd(), zipPath)}`,
                  ),
                )
                if (!resolvedOptions?.kicadProject) {
                  fs.rmSync(projectOutputDir, { recursive: true, force: true })
                }
              }
            }
          }
        }

        // Sequential build function (used when concurrency is 1)
        const buildSequentially = async () => {
          for (const filePath of circuitFiles) {
            const relative = path.relative(projectDir, filePath)
            console.log(`Building ${relative}...`)
            const outputDirName = getOutputDirName(relative)
            const outputPath = path.join(distDir, outputDirName, "circuit.json")
            const startedAt = resolvedOptions?.profile ? performance.now() : 0
            const buildOutcome = await buildFile(
              filePath,
              outputPath,
              projectDir,
              buildOptions,
            )
            if (resolvedOptions?.profile) {
              const durationMs = performance.now() - startedAt
              profileEntries.push({ filePath: relative, durationMs })
              console.log(
                kleur.cyan(`[profile] ${relative}: ${durationMs.toFixed(1)}ms`),
              )
            }
            await processBuildResult(filePath, outputPath, buildOutcome)

            if (buildOutcome.isFatalError && !statusMode) {
              break
            }
          }
        }

        // Parallel build function (used when concurrency > 1)
        const buildWithWorkers = async () => {
          const filesToBuild = circuitFiles.map((filePath) => {
            const relative = path.relative(projectDir, filePath)
            const outputDirName = getOutputDirName(relative)
            const outputPath = path.join(distDir, outputDirName, "circuit.json")
            const glbOutputPath = resolvedOptions?.glbs
              ? path.join(distDir, outputDirName, "3d.glb")
              : undefined
            const stepOutputPath = resolvedOptions?.step
              ? path.join(distDir, outputDirName, "3d.step")
              : undefined

            const generatePreviewAssets = (() => {
              if (!shouldGeneratePreviewAssetsInWorker) {
                return false
              }

              if (shouldGenerateAllPreviewImages) {
                return true
              }

              if (resolvedPreviewEntrypointForWorker) {
                return (
                  path.resolve(filePath) === resolvedPreviewEntrypointForWorker
                )
              }

              return filePath === circuitFiles[0]
            })()

            const previewOutputDir =
              shouldGeneratePreviewAssetsInWorker && generatePreviewAssets
                ? path.join(distDir, outputDirName)
                : undefined

            return {
              filePath,
              outputPath,
              glbOutputPath,
              stepOutputPath,
              previewOutputDir,
              generatePreviewAssets,
            }
          })

          await buildFilesWithWorkerPool({
            files: filesToBuild,
            projectDir,
            concurrency: concurrencyValue,
            buildOptions,
            workerJobTimeoutMs: projectConfig?.build?.workerTimeoutMs,
            stopOnFatal: true,
            onLog: (lines) => {
              for (const line of lines) {
                console.log(line)
              }
            },
            onJobComplete: async (result: BuildJobResult) => {
              const relative = path.relative(projectDir, result.filePath)
              if (result.ok) {
                if (result.hasErrors) {
                  console.log(
                    kleur.yellow(
                      `⚠ ${relative} (${result.errors.length} error(s))`,
                    ),
                  )
                } else {
                  console.log(kleur.green(`✓ ${relative}`))
                }
              } else {
                console.log(kleur.red(`✗ ${relative}`))
                for (const error of result.errors) {
                  console.error(kleur.red(`  ${error}`))
                }
              }

              if (
                resolvedOptions?.profile &&
                typeof result.durationMs === "number"
              ) {
                profileEntries.push({
                  filePath: relative,
                  durationMs: result.durationMs,
                })
                console.log(
                  kleur.cyan(
                    `[profile] ${relative}: ${result.durationMs.toFixed(1)}ms`,
                  ),
                )
              }

              // circuitJson is not passed through IPC - processBuildResult reads from file if needed
              await processBuildResult(result.filePath, result.outputPath, {
                ok: result.ok,
                hasErrors: result.hasErrors,
                ignoredDrcByCategory: result.ignoredDrcByCategory,
                isFatalError: result.isFatalError,
                errors: result.errors,
                warnings: result.warnings,
              })

              if (resolvedOptions?.glbs && result.ok) {
                const outputDir = path.dirname(result.outputPath)
                const prefixRelative = path.relative(distDir, outputDir) || "."
                const prefix =
                  prefixRelative === "." ? "" : `[${prefixRelative}] `

                if (result.glbOk) {
                  console.log(`${prefix}Written 3d.glb`)
                } else if (result.glbOutputPath && result.glbError) {
                  console.error(
                    `${prefix}Failed to generate GLB: ${result.glbError}`,
                  )
                }
              }

              if (resolvedOptions?.step && result.ok) {
                const outputDir = path.dirname(result.outputPath)
                const prefixRelative = path.relative(distDir, outputDir) || "."
                const prefix =
                  prefixRelative === "." ? "" : `[${prefixRelative}] `

                if (result.stepOk) {
                  console.log(`${prefix}Written 3d.step`)
                } else if (result.stepOutputPath && result.stepError) {
                  console.error(
                    `${prefix}Failed to generate STEP: ${result.stepError}`,
                  )
                }
              }
            },
          })
        }

        if (effectiveConcurrencyValue > 1) {
          await buildWithWorkers()
        } else {
          await buildSequentially()
        }

        if (shouldGeneratePreviewImages) {
          if (shouldGeneratePreviewAssetsInWorker) {
            console.log(
              shouldGenerateAllPreviewImages
                ? "Generating preview images for all builds in worker threads..."
                : "Generating preview images in worker threads...",
            )
          } else {
            console.log(
              shouldGenerateAllPreviewImages
                ? "Generating preview images for all builds..."
                : "Generating preview images...",
            )
            await buildPreviewImages({
              builtFiles,
              distDir,
              mainEntrypoint,
              previewComponentPath,
              allImages: shouldGenerateAllPreviewImages,
              imageFormats: imageFormatSelection,
              pcbSnapshotSettings: resolvedOptions?.showCourtyards
                ? {
                    ...projectConfig?.pcbSnapshotSettings,
                    showCourtyards: true,
                  }
                : projectConfig?.pcbSnapshotSettings,
            })
          }
        }

        if (!statusMode && resolvedOptions?.previewGltf) {
          console.log("Generating preview GLTF...")
          await buildPreviewGltf({
            builtFiles,
            distDir,
            mainEntrypoint,
            previewComponentPath,
          })
        }

        if (!statusMode && resolvedOptions?.glbs && concurrencyValue === 1) {
          console.log("Generating GLB models for all builds...")
          await buildGlbs({
            builtFiles,
            distDir,
          })
        }

        if (!statusMode && resolvedOptions?.step && concurrencyValue === 1) {
          console.log("Generating STEP models for all builds...")
          await buildStepFiles({
            builtFiles,
            distDir,
          })
        }

        if (!statusMode && resolvedOptions?.transpile) {
          const includeBoardPatterns =
            projectConfig?.includeBoardFiles?.filter((pattern) =>
              pattern.trim(),
            ) ?? []
          const hasConfiguredIncludeBoardFiles = includeBoardPatterns.length > 0

          validateMainInDist(projectDir, distDir)

          console.log("Transpiling entry file...")
          // For transpilation, we need to find the main library entrypoint
          // (not board files).
          const { mainEntrypoint: transpileEntrypoint } =
            await getBuildEntrypoints({
              fileOrDir: file,
              includeBoardFiles: false,
            })
          const resolvedFileArgPath = file
            ? path.resolve(projectDir, file)
            : undefined
          const fileArgIsDirectFile = Boolean(
            resolvedFileArgPath &&
              fs.existsSync(resolvedFileArgPath) &&
              fs.statSync(resolvedFileArgPath).isFile(),
          )
          const entryFile = fileArgIsDirectFile
            ? resolvedFileArgPath
            : transpileEntrypoint
          if (!entryFile) {
            if (
              hasConfiguredIncludeBoardFiles &&
              !transpileExplicitlyRequested
            ) {
              console.log(
                "Skipping transpilation because includeBoardFiles is configured and no library entrypoint was found.",
              )
            } else {
              console.error(
                "No entry file found for transpilation. Make sure you have a lib/index.ts or set mainEntrypoint in tscircuit.config.json",
              )
              exitBuild(1, "transpile entry file not found")
            }
          } else {
            const transpileSuccess = await transpileFile({
              input: entryFile,
              outputDir: distDir,
              projectDir,
            })
            if (!transpileSuccess) {
              console.error("Transpilation failed")
              exitBuild(1, "transpile command failed")
            }
          }
        }

        if (!statusMode && resolvedOptions?.site) {
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

        if (!statusMode && resolvedOptions?.kicadLibrary) {
          console.log("Generating KiCad library...")
          // Find the main library entrypoint for KiCad library generation
          const { mainEntrypoint: kicadEntrypoint } = await getBuildEntrypoints(
            {
              fileOrDir: file,
              includeBoardFiles: false,
            },
          )
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
              exitBuild(1, "kicad-library entry file not found")
            }
          } else {
            const libraryName =
              resolvedOptions?.kicadLibraryName ||
              resolveKicadLibraryName({ projectDir })
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
                exitBuild(1, "kicad-library generation failed")
              }
            }
          }
        }

        if (!statusMode && resolvedOptions?.kicadPcm) {
          console.log("Generating KiCad PCM assets...")
          const { mainEntrypoint: kicadEntrypoint } = await getBuildEntrypoints(
            {
              fileOrDir: file,
              includeBoardFiles: false,
            },
          )

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
              exitBuild(1, "kicad-pcm entry file not found")
            }
          } else {
            try {
              await buildKicadPcm({
                entryFile,
                projectDir,
                distDir,
                kicadLibraryName: resolvedOptions?.kicadLibraryName,
              })
            } catch (err) {
              console.error(
                `Error generating KiCad PCM assets: ${err instanceof Error ? err.message : err}`,
              )
              if (!resolvedOptions?.ignoreErrors) {
                exitBuild(1, "kicad-pcm generation failed")
              }
            }
          }
        }

        // Fatal errors (e.g., circuit generation exceptions) always cause exit code 1.
        const shouldExitNonZero = hasFatalErrors

        const successCount = builtFiles.filter((f) => f.ok).length
        const failCount = builtFiles.length - successCount
        const enabledOpts = [
          resolvedOptions?.status && "status",
          !statusMode && resolvedOptions?.site && "site",
          !statusMode && resolvedOptions?.transpile && "transpile",
          resolvedOptions?.ignoreNetlistDrc && "ignore-netlist-drc",
          resolvedOptions?.ignorePinSpecificationDrc &&
            "ignore-pin-specification-drc",
          resolvedOptions?.ignorePlacementDrc && "ignore-placement-drc",
          resolvedOptions?.ignoreRoutingDrc && "ignore-routing-drc",
          !statusMode && resolvedOptions?.previewImages && "preview-images",
          !statusMode && resolvedOptions?.allImages && "all-images",
          !statusMode && resolvedOptions?.pngs && "pngs",
          !statusMode && resolvedOptions?.pcbPng && "pcb-png",
          !statusMode && resolvedOptions?.svgs && "svgs",
          !statusMode && resolvedOptions?.pcbSvgs && "pcb-svgs",
          !statusMode && resolvedOptions?.schematicSvgs && "schematic-svgs",
          !statusMode && resolvedOptions?.simulationSvgs && "simulation-svgs",
          !statusMode &&
            resolvedOptions?.simulationSchematicSvgs &&
            "simulation-schematic-svgs",
          !statusMode && resolvedOptions?.["3dPng"] && "3d-png",
          !statusMode && resolvedOptions?.["3d"] && "3d",
          !statusMode && resolvedOptions?.pcbOnly && "pcb-only",
          !statusMode && resolvedOptions?.schematicOnly && "schematic-only",
          !statusMode && resolvedOptions?.glbs && "glbs",
          !statusMode && resolvedOptions?.step && "step",
          !statusMode && resolvedOptions?.kicadProject && "kicad-project",
          !statusMode && resolvedOptions?.kicadLibrary && "kicad-library",
          !statusMode && resolvedOptions?.kicadPcm && "kicad-pcm",
          !statusMode && resolvedOptions?.previewGltf && "preview-gltf",
          resolvedOptions?.profile && "profile",
        ].filter(Boolean) as string[]
        const displayedConfigAppliedOpts = statusMode
          ? configAppliedOpts.filter((opt) => opt === "routing-disabled")
          : configAppliedOpts

        if (resolvedOptions?.profile && profileEntries.length > 0) {
          console.log("")
          console.log(kleur.bold("Profile Summary (slowest first)"))
          const sortedProfileEntries = [...profileEntries].sort(
            (a, b) => b.durationMs - a.durationMs,
          )
          for (const profileEntry of sortedProfileEntries) {
            console.log(
              `  ${kleur.cyan(`${profileEntry.durationMs.toFixed(1)}ms`)} ${profileEntry.filePath}`,
            )
          }
        }

        const totalIgnoredDrc = Object.values(ignoredDrcByCategory).reduce(
          (sum, count) => sum + count,
          0,
        )

        if (statusMode) {
          const errorCount = statusIssues.filter(
            (issue) => issue.severity === "error",
          ).length
          const warningCount = statusIssues.length - errorCount
          const issueCountByCategory = new Map<
            CircuitJsonIssueCategory,
            number
          >()
          for (const issue of statusIssues) {
            issueCountByCategory.set(
              issue.category,
              (issueCountByCategory.get(issue.category) ?? 0) + 1,
            )
          }
          const getCategoryCount = (category: CircuitJsonIssueCategory) =>
            issueCountByCategory.get(category) ?? 0

          console.log("")
          console.log(kleur.bold("Build status"))
          console.log(
            `  Circuits  ${kleur.green(`${successCount} passed`)}${failCount > 0 ? kleur.red(` ${failCount} failed`) : ""}`,
          )
          console.log(
            `  Errors    ${errorCount > 0 ? kleur.red(String(errorCount)) : kleur.green("0")}`,
          )
          console.log(
            `  Warnings  ${warningCount > 0 ? kleur.yellow(String(warningCount)) : kleur.green("0")}`,
          )
          console.log(`  Schematic issues ${getCategoryCount("schematic")}`)
          console.log(`  Source issues    ${getCategoryCount("source")}`)
          console.log(`  PCB issues       ${getCategoryCount("pcb")}`)
          console.log(`  Netlist issues   ${getCategoryCount("netlist")}`)
          console.log(
            `  Pin spec issues  ${getCategoryCount("pin_specification")}`,
          )
          console.log(`  Placement issues ${getCategoryCount("placement")}`)
          console.log(`  Routing issues   ${getCategoryCount("routing")}`)
          console.log(`  Simulation issues ${getCategoryCount("simulation")}`)
          console.log(`  Unknown issues   ${getCategoryCount("unknown")}`)
          if (enabledOpts.length > 0) {
            console.log(`  Options   ${kleur.cyan(enabledOpts.join(", "))}`)
          }
          if (displayedConfigAppliedOpts.length > 0) {
            console.log(
              `  Config    ${kleur.magenta(displayedConfigAppliedOpts.join(", "))} ${kleur.dim("(from tscircuit.config.json)")}`,
            )
          }
          if (totalIgnoredDrc > 0) {
            console.log(
              `  Ignored DRC ${kleur.yellow(`${totalIgnoredDrc}`)} ${kleur.dim(`(${formatIgnoredDrcCounts(ignoredDrcByCategory)})`)}`,
            )
          }

          if (statusIssues.length > 0) {
            console.log("")
            console.log(kleur.bold("Issues"))
            let lastFilePath: string | undefined
            for (const issue of statusIssues) {
              if (issue.filePath !== lastFilePath) {
                console.log(`  ${kleur.dim(issue.filePath)}`)
                lastFilePath = issue.filePath
              }
              const label =
                issue.severity === "error"
                  ? kleur.red("error")
                  : kleur.yellow("warning")
              console.log(`    ${label} [${issue.category}] ${issue.message}`)
            }
          } else {
            console.log("")
            console.log(kleur.green("✓ No errors or warnings"))
          }

          if (shouldExitNonZero) {
            exitBuild(1, "fatal circuit build errors occurred")
          }

          exitBuild(0, "build status finished successfully")
        }

        console.log("")
        console.log(kleur.bold("Build complete"))
        console.log(
          `  Circuits  ${kleur.green(`${successCount} passed`)}${failCount > 0 ? kleur.red(` ${failCount} failed`) : ""}`,
        )
        if (enabledOpts.length > 0) {
          console.log(`  Options   ${kleur.cyan(enabledOpts.join(", "))}`)
        }
        if (displayedConfigAppliedOpts.length > 0) {
          console.log(
            `  Config    ${kleur.magenta(displayedConfigAppliedOpts.join(", "))} ${kleur.dim("(from tscircuit.config.json)")}`,
          )
        }
        console.log(
          `  Output    ${kleur.dim(path.relative(process.cwd(), distDir) || "dist")}`,
        )
        if (totalIgnoredDrc > 0) {
          console.log(
            `  Ignored DRC ${kleur.yellow(`${totalIgnoredDrc}`)} ${kleur.dim(`(${formatIgnoredDrcCounts(ignoredDrcByCategory)})`)}`,
          )
        }
        console.log(
          hasErrors
            ? kleur.yellow("\n⚠ Build completed with errors")
            : kleur.green("\n✓ Done"),
        )
        if (shouldExitNonZero) {
          exitBuild(1, "fatal circuit build errors occurred")
        }

        exitBuild(0, "build finished successfully")
      } catch (error) {
        if (error instanceof BuildNoMatchingFilesError) {
          console.error(error.message)
          exitBuild(1, "no matching build files found")
        }

        const message = error instanceof Error ? error.message : String(error)
        console.error(message)
        exitBuild(1, "unexpected exception")
      }
    })
}
