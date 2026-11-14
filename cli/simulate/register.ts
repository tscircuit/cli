import { type Command, InvalidArgumentError, Option } from "commander"
import { runSimulationReport } from "lib/shared/run-simulation-report"
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

type AnalogOptions = {
  disablePartsEngine?: boolean
  output?: string
  solverTimeoutMs?: number
  format: "table" | "json"
}

export const registerSimulate = (program: Command) => {
  const simulateCommand = program
    .enablePositionalOptions()
    .command("simulate")
    .description(
      "Run a simulation. For a static SVG, use tsci build <file> --simulation-svgs.",
    )

  registerReturnCurrentSimulation(simulateCommand)

  simulateCommand
    .argument("<file>", "Path to tscircuit tsx or circuit json file")
    .option("--disable-parts-engine", "Disable the parts engine")
    .option("--output <directory>", "Fresh pcb_spice report directory")
    .addOption(
      new Option(
        "--format <format>",
        "Analog result format; JSON preserves full precision and provenance",
      )
        .choices(["table", "json"])
        .default("table"),
    )
    .option(
      "--solver-timeout-ms <milliseconds>",
      "Per-process pcb_spice timeout (default: 900000 ms)",
      (value: string) => {
        const timeout = Number(value)
        if (
          !Number.isSafeInteger(timeout) ||
          timeout <= 0 ||
          timeout > 2_147_483_647
        ) {
          throw new InvalidArgumentError(
            "Expected a positive safe integer up to 2147483647 milliseconds",
          )
        }
        return timeout
      },
    )
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
        if (options.format !== "table")
          throw new Error("--format requires an ngspice simulation")
        if (engines.some((engine) => engine !== "pcb_spice")) {
          throw new Error(
            "Mixed pcb_spice and other SPICE engines are unsupported; run separate entries for each engine",
          )
        }
        await runPcbSpiceSimulation({
          file,
          projectDir,
          circuitJson,
          modeling: input.modeling,
          output: options.output,
          solverTimeoutMs: options.solverTimeoutMs,
          baseDir,
        })
        return
      }
      if (engines.some((engine) => engine && engine !== "ngspice")) {
        throw new Error("simulate supports ngspice or pcb_spice experiments")
      }
      if (options.solverTimeoutMs !== undefined) {
        throw new Error('--solver-timeout-ms requires spiceEngine="pcb_spice"')
      }
      if (options.output) {
        throw new Error('--output requires spiceEngine="pcb_spice"')
      }
      const spiceString = getSpiceWithPaddedSim(circuitJson)

      const report = await runSimulationReport(spiceString)
      if (options.format === "json") {
        console.log(JSON.stringify(report))
      } else {
        if (report.diagnostics.warnings.length)
          console.error(report.diagnostics.warnings.join("\n"))
        if (report.diagnostics.errors.length)
          console.error(report.diagnostics.errors.join("\n"))
        if (report.diagnostics.log) console.log(report.diagnostics.log)
        if (report.status === "success" && report.result)
          console.log(resultToTable(report.result))
      }
      process.exit(report.status === "failed" ? 1 : 0)
    })
}
