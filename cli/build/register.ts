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
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { convertCircuitJsonToSimple3dSvg } from "circuit-json-to-simple-3d"
import sharp from "sharp"

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
    .option("--preview-images", "Generate preview images in the dist directory")
    .action(
      async (
        file?: string,
        options?: {
          ignoreErrors?: boolean
          ignoreWarnings?: boolean
          disablePcb?: boolean
          disablePartsEngine?: boolean
          site?: boolean
          previewImages?: boolean
        },
      ) => {
        const { projectDir, circuitFiles, mainEntrypoint } =
          await getBuildEntrypoints({
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

        const builtFiles: Array<{
          sourcePath: string
          outputPath: string
          ok: boolean
        }> = []

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
          builtFiles.push({
            sourcePath: filePath,
            outputPath,
            ok,
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

        if (options?.previewImages) {
          const successfulBuilds = builtFiles.filter((file) => file.ok)
          const normalizedMainEntrypoint = mainEntrypoint
            ? path.resolve(mainEntrypoint)
            : undefined
          const previewBuild = (() => {
            if (normalizedMainEntrypoint) {
              const match = successfulBuilds.find(
                (built) =>
                  path.resolve(built.sourcePath) === normalizedMainEntrypoint,
              )
              if (match) return match
            }
            return successfulBuilds[0]
          })()

          if (!previewBuild) {
            console.warn(
              "No successful build output available for preview image generation.",
            )
          } else {
            try {
              const circuitJsonRaw = fs.readFileSync(
                previewBuild.outputPath,
                "utf-8",
              )
              const circuitJson = JSON.parse(circuitJsonRaw)

              const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson)
              const schematicSvg = convertCircuitJsonToSchematicSvg(circuitJson)
              const simple3dSvg =
                await convertCircuitJsonToSimple3dSvg(circuitJson)

              fs.writeFileSync(path.join(distDir, "pcb.svg"), pcbSvg, "utf-8")
              fs.writeFileSync(
                path.join(distDir, "schematic.svg"),
                schematicSvg,
                "utf-8",
              )

              if (simple3dSvg) {
                const pngBuffer = await sharp(Buffer.from(simple3dSvg))
                  .png()
                  .toBuffer()
                fs.writeFileSync(path.join(distDir, "3d.png"), pngBuffer)
              }
            } catch (error) {
              console.error("Failed to generate preview images:", error)
            }
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
      },
    )
}
