import type { PlatformConfig } from "@tscircuit/props"
import { runSimulation } from "lib/eecircuit-engine/run-simulation"
import { loadRuntimeProjectConfig } from "lib/project-config"
import { findCircuitProjectDir } from "lib/shared/circuit-json-build-cache"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import { getSpiceWithPaddedSim } from "lib/shared/get-spice-with-sim"
import { mergePlatformConfigs } from "lib/shared/platform-config-utils"
import { resultToTable } from "lib/shared/result-to-table"
import { loadAnalogInput } from "./load-analog-input"
import { runPcbSpiceSimulation } from "./run-pcb-spice-simulation"

export type AnalogOptions = {
  disablePartsEngine?: boolean
  output?: string
}

export const runAnalogSimulation = async (
  file: string,
  options: AnalogOptions,
) => {
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

  const { circuitJson, isPipelineJsonEntry } = await loadAnalogInput({
    file,
    projectDir,
    platformConfig: getPlatformConfigWithCliDefaults(platformConfig, {
      projectDir,
    }),
  })
  if (
    circuitJson.some(
      (record) =>
        record.type === "simulation_experiment" &&
        record.spice_engine === "pcb_spice",
    )
  ) {
    if (file.endsWith(".json") && !isPipelineJsonEntry) {
      throw new Error(
        "pcb_spice requires a TSX entry exporting modeling, or a pipeline JSON entry with modeling and a circuit path",
      )
    }
    await runPcbSpiceSimulation({ file, ...options, projectDir })
    process.exit(0)
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
}
