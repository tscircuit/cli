import type { PlatformConfig } from "@tscircuit/props"
import type { Command } from "commander"
import { runSimulation } from "lib/eecircuit-engine/run-simulation"
import { loadRuntimeProjectConfig } from "lib/project-config"
import { findCircuitProjectDir } from "lib/shared/circuit-json-build-cache"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import { getSpiceWithPaddedSim } from "lib/shared/get-spice-with-sim"
import { mergePlatformConfigs } from "lib/shared/platform-config-utils"
import { resultToTable } from "lib/shared/result-to-table"
import { loadAnalogInput } from "./load-analog-input"
import { registerReturnCurrentSimulation } from "./register-return-current"
import { runPcbSpiceSimulation } from "./run-pcb-spice-simulation"

type AnalogOptions = {
  disablePartsEngine?: boolean
  output?: string
  open?: boolean
}

export const registerSimulate = (program: Command) => {
  const simulateCommand = program
    .command("simulate")
    .description("Run a simulation")

  registerReturnCurrentSimulation(simulateCommand)

  simulateCommand
    .command("analog")
    .description("Run an analog SPICE simulation")
    .argument("<file>", "Path to tscircuit tsx or circuit json file")
    .option("--disable-parts-engine", "Disable the parts engine")
    .option("--output <directory>", "Fresh pcb_spice report directory")
    .option("--open", "Open the pcb_spice HTML report after simulation")
    .action(async (file: string, options: AnalogOptions, command: Command) => {
      const projectDir = findCircuitProjectDir(file)
      const projectConfig = await loadRuntimeProjectConfig(projectDir)
      // Dispatch and schematic SPICE need connectivity, not a PCB autoroute.
      // The PCB backend renders its physical input separately through upstream.
      const commandPlatformConfig: PlatformConfig = {
        routingDisabled: true,
        ...(options.disablePartsEngine ? { partsEngineDisabled: true } : {}),
      }
      const platformConfig = mergePlatformConfigs(
        projectConfig?.platformConfig,
        commandPlatformConfig,
      )

      const { circuitJson, pipelineJsonEntry } = await loadAnalogInput(
        file,
        projectDir,
        getPlatformConfigWithCliDefaults(platformConfig, {
          projectDir,
        }),
      )
      if (!circuitJson) {
        console.log("error: Failed to generate circuit JSON")
        process.exit(1)
      }
      if (
        circuitJson.some(
          (record: { type: string; spice_engine?: string }) =>
            record.type === "simulation_experiment" &&
            record.spice_engine === "pcb_spice",
        )
      ) {
        if (file.endsWith(".json") && !pipelineJsonEntry) {
          command.error(
            "pcb_spice requires a TSX entry exporting modeling, or a pipeline JSON entry with modeling and a circuit path",
          )
        }
        await runPcbSpiceSimulation(file, options, projectDir)
        process.exit(0)
      }
      if (options.open || options.output) {
        command.error('--open and --output require spiceEngine="pcb_spice"')
      }
      const spiceString = getSpiceWithPaddedSim(circuitJson)

      const { result, info, errors } = await runSimulation(spiceString)

      if (errors?.length > 0) {
        console.error(errors.join("\n"))
      }

      if (info) {
        console.log(info)
      }

      const tableContent = resultToTable(result)

      console.log(tableContent)
      process.exit(0)
    })
}
