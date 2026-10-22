import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
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
  modeling?: string
}

export const runAnalogSimulation = async (
  file: string,
  options: AnalogOptions,
) => {
  const projectDir = findCircuitProjectDir(file)
  const projectConfig = await loadRuntimeProjectConfig(projectDir)
  const commandPlatformConfig: PlatformConfig = {
    ...(options.disablePartsEngine ? { partsEngineDisabled: true } : {}),
  }
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
    const modeling = options.modeling
      ? JSON.parse(await readFile(resolve(options.modeling), "utf8"))
      : input.modeling
    await runPcbSpiceSimulation({
      circuitJson,
      modeling,
      output: options.output,
      baseDir,
    })
    return
  }
  if (engines.some((engine) => engine && engine !== "ngspice")) {
    throw new Error("simulate analog supports ngspice or pcb_spice experiments")
  }
  if (options.output || options.modeling) {
    throw new Error('--output and --modeling require spiceEngine="pcb_spice"')
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
