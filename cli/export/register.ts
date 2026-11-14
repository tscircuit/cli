import {
  addPcbXRayOptions,
  getPcbXRaySettings,
  type PcbXRayCliOptions,
} from "lib/shared/pcb-x-ray-options"
import type { Command } from "commander"
import { exportSnippet } from "lib/shared/export-snippet"
import type { ExportFormat } from "lib/shared/export-snippet"
import { ALLOWED_EXPORT_FORMATS } from "lib/shared/export-snippet"
import { getOrGenerateCircuitJson } from "lib/shared/get-or-generate-circuit-json"
import { getSpiceWithPaddedSim } from "lib/shared/get-spice-with-sim"
import { runSimulation } from "lib/eecircuit-engine/run-simulation"
import { resultToCsv } from "lib/shared/result-to-csv"
import path from "node:path"
import { promises as fs } from "node:fs"
import type { PlatformConfig } from "@tscircuit/props"
import { loadRuntimeProjectConfig } from "lib/project-config"
import { mergePlatformConfigs } from "lib/shared/platform-config-utils"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import { findCircuitProjectDir } from "lib/shared/circuit-json-build-cache"
import {
  resolveExplosionVideoOptions,
  type ExplosionVideoOptions,
} from "lib/shared/explosion-video-options"

export const registerExport = (program: Command) => {
  addPcbXRayOptions(program.command("export"))
    .description("Export tscircuit code to various formats")
    .argument("<file>", "Path to the package file")
    .option(
      "-f, --format <format>",
      `Output format (${ALLOWED_EXPORT_FORMATS.join(", ")})`,
    )
    .option("-o, --output <path>", "Output file path")
    .option("--fps <number>", "Explosion MP4 frames per second (default: 24)")
    .option(
      "--width <pixels>",
      "Explosion MP4 width, an even integer (default: 960)",
    )
    .option(
      "--height <pixels>",
      "Explosion MP4 height, an even integer (default: 720)",
    )
    .option(
      "--stage-duration <seconds>",
      "Explosion movement time per stage (default: 1)",
    )
    .option(
      "--hold-duration <seconds>",
      "Pause at assembled and completed stages (default: 0.5)",
    )
    .option(
      "--system-page <name-or-id>",
      "Select a system diagram page (requires --format system-svg)",
    )
    .option(
      "--drawing <name-or-filename>",
      "Select a drawing page by name or SVG filename",
    )
    .option("--layer <layer>", "PCB front layer: top or bottom")
    .option("--disable-parts-engine", "Disable the parts engine")
    .option("--show-courtyards", "Show courtyard outlines in PCB SVG output")
    .addHelpText(
      "after",
      `\nFabrication files:\n  tsci export board.tsx -f gerbers\n  Writes <input-basename>-gerbers.zip containing the Gerber layers (.gbr),\n  Excellon drill files (.drl), bom.csv and pick_and_place.csv (JLCPCB format).\n`,
    )
    .action(
      async (
        file,
        options: {
          layer?: "top" | "bottom"
          drawing?: string
          systemPage?: string
          format?: string
          output?: string
          disablePartsEngine?: boolean
          showCourtyards?: boolean
        } & PcbXRayCliOptions &
          Partial<Record<keyof ExplosionVideoOptions, string>>,
      ) => {
        const formatOption =
          options.format ?? (options.drawing ? "drawing-svg" : "json")
        const hasVideoOptions = [
          options.fps,
          options.width,
          options.height,
          options.stageDuration,
          options.holdDuration,
        ].some((v) => v !== undefined)
        if (hasVideoOptions && formatOption !== "explosion-mp4")
          throw new Error("Video options require --format explosion-mp4")
        const explosionVideoOptions =
          formatOption === "explosion-mp4"
            ? resolveExplosionVideoOptions(options)
            : undefined
        if (options.drawing && formatOption !== "drawing-svg")
          throw new Error("--drawing requires --format drawing-svg")
        if (options.systemPage && formatOption !== "system-svg")
          throw new Error("--system-page requires --format system-svg")
        if (options.layer && !["top", "bottom"].includes(options.layer)) {
          console.error("Unknown PCB layer. Valid layers: top, bottom")
          process.exit(1)
        }
        if (
          (options.xRayNet?.length ||
            options.hiddenLayerOpacity !== undefined) &&
          !["pcb-svg", "pcb-png"].includes(formatOption)
        ) {
          console.error("X-Ray options require --format pcb-svg or pcb-png.")
          process.exit(1)
        }
        const projectConfig = await loadRuntimeProjectConfig(process.cwd())

        const commandPlatformConfig: PlatformConfig | undefined =
          options.disablePartsEngine === true
            ? { partsEngineDisabled: true }
            : undefined
        const platformConfig = mergePlatformConfigs(
          projectConfig?.platformConfig,
          commandPlatformConfig,
        )
        const platformConfigWithCliDefaults = getPlatformConfigWithCliDefaults(
          platformConfig,
          {
            projectDir: findCircuitProjectDir(file),
          },
        )

        if (formatOption === "spice") {
          const { circuitJson } = await getOrGenerateCircuitJson({
            filePath: file,
            platformConfig: platformConfigWithCliDefaults,
          })
          if (circuitJson) {
            const spiceString = getSpiceWithPaddedSim(circuitJson as any)

            const outputSpicePath =
              options.output ??
              path.join(
                path.dirname(file),
                `${path.basename(file, path.extname(file))}.spice.cir`,
              )

            await fs.writeFile(outputSpicePath, spiceString)

            const { result } = await runSimulation(spiceString)

            const csvContent = resultToCsv(result)

            const outputCsvPath = outputSpicePath.replace(
              /\.spice\.cir$/,
              ".csv",
            )

            await fs.writeFile(outputCsvPath, csvContent)
            console.log(
              `Exported to ${outputSpicePath} and ${outputCsvPath} (simulation results)!`,
            )
          }
          process.exit(0)
        }

        const format = formatOption as ExportFormat

        await exportSnippet({
          filePath: file,
          format,
          drawing: options.drawing,
          systemPage: options.systemPage,
          outputPath: options.output,
          explosionVideoOptions,
          platformConfig: platformConfigWithCliDefaults,
          pcbSnapshotSettings: {
            ...projectConfig?.pcbSnapshotSettings,
            ...(options.showCourtyards ? { showCourtyards: true } : {}),
            ...getPcbXRaySettings(options),
            ...(options.layer ? { layer: options.layer } : {}),
          },
          onExit: (code) => process.exit(code),
          onError: (message) => console.error(message),
          onSuccess: ({ outputDestination }) =>
            console.log(`Exported to ${outputDestination}!`),
        })
      },
    )
}
