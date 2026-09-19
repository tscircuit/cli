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

export const registerExport = (program: Command) => {
  addPcbXRayOptions(program.command("export"))
    .description("Export tscircuit code to various formats")
    .argument("<file>", "Path to the package file")
    .option(
      "-f, --format <format>",
      `Output format (${ALLOWED_EXPORT_FORMATS.join(", ")})`,
    )
    .option("-o, --output <path>", "Output file path")
    .option("--layer <layer>", "PCB front layer: top or bottom")
    .option("--disable-parts-engine", "Disable the parts engine")
    .option("--show-courtyards", "Show courtyard outlines in PCB SVG output")
    .action(
      async (
        file,
        options: {
          layer?: "top" | "bottom"
          format?: string
          output?: string
          disablePartsEngine?: boolean
          showCourtyards?: boolean
        } & PcbXRayCliOptions,
      ) => {
        const formatOption = options.format ?? "json"
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
          outputPath: options.output,
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
