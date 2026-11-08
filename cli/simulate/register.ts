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
import { runSignalIntegritySimulation } from "./run-signal-integrity-simulation"

type AnalogOptions = {
  disablePartsEngine?: boolean
  output?: string
}

export const registerSimulate = (program: Command) => {
  const simulateCommand = program
    .enablePositionalOptions()
    .command("simulate")
    .description("Run a simulation")

  registerReturnCurrentSimulation(simulateCommand)

  simulateCommand
    .argument("<file>", "Path to tscircuit tsx or circuit json file")
    .option("--disable-parts-engine", "Disable the parts engine")
    .option("--output <directory>", "Fresh signal integrity report directory")
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

      const { circuitJson } = await loadAnalogInput({
        file,
        projectDir,
        platformConfig: getPlatformConfigWithCliDefaults(platformConfig, {
          projectDir,
        }),
      })
      const engines = circuitJson.flatMap((record) =>
        record.type === "simulation_experiment" ? [record.spice_engine] : [],
      )
      if (engines.some((engine) => engine && engine !== "ngspice")) {
        throw new Error("simulate supports ngspice experiments")
      }
      const hasSignalIntegrity = circuitJson.some(
        (record) => record.type === "simulation_signal_integrity",
      )
      if (hasSignalIntegrity) {
        await runSignalIntegritySimulation({
          file,
          projectDir,
          circuitJson,
          output: options.output,
        })
      } else {
        console.log(`No <signalintegrity> blocks found in ${file}`)
        if (options.output) {
          throw new Error("--output requires a <signalintegrity> block")
        }
      }
      if (hasSignalIntegrity && engines.length === 0) return
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
