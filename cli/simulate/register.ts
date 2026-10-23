import type { Command } from "commander"
import { runSimulation } from "lib/eecircuit-engine/run-simulation"
import { resultToTable } from "lib/shared/result-to-table"
import { getSpiceWithPaddedSim } from "lib/shared/get-spice-with-sim"
import type { PlatformConfig } from "@tscircuit/props"
import { loadRuntimeProjectConfig } from "lib/project-config"
import { mergePlatformConfigs } from "lib/shared/platform-config-utils"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import { findCircuitProjectDir } from "lib/shared/circuit-json-build-cache"
import { registerReturnCurrentSimulation } from "./register-return-current"

import { loadAnalogInput } from "./load-analog-input"
import { runPcbSpiceSimulation } from "./run-pcb-spice-simulation"

type AnalogOptions = { disablePartsEngine?: boolean; output?: string }

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
    .action(async (file: string, options: AnalogOptions) => {
      const projectDir = findCircuitProjectDir(file)
      const projectConfig = await loadRuntimeProjectConfig(projectDir)
      const commandPlatformConfig: PlatformConfig | undefined =
        options.disablePartsEngine === true
          ? { partsEngineDisabled: true }
          : undefined
      const platformConfig = mergePlatformConfigs(
        projectConfig?.platformConfig,
        commandPlatformConfig,
      )

      const input = await loadAnalogInput({
        file,
        projectDir,
        platformConfig: getPlatformConfigWithCliDefaults(platformConfig, {
          projectDir,
        }),
      })
      const { circuitJson, baseDir } = input
      const engines = circuitJson.flatMap((record) =>
        record.type === "simulation_experiment" ? [record.spice_engine] : [],
      )
      if (engines.includes("pcb_spice")) {
        if (engines.some((engine) => engine !== "pcb_spice")) {
          throw new Error(
            "Mixed pcb_spice and other SPICE engines are unsupported; run separate entries for each engine",
          )
        }
        await runPcbSpiceSimulation({
          circuitJson,
          modeling: input.modeling,
          output: options.output,
          baseDir,
        })
        return
      }
      if (engines.some((engine) => engine && engine !== "ngspice")) {
        throw new Error(
          "simulate analog supports ngspice or pcb_spice experiments",
        )
      }
      if (options.output) {
        throw new Error('--output requires spiceEngine="pcb_spice"')
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
