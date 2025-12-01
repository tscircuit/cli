import type { Command } from "commander"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { runSimulation } from "lib/eecircuit-engine/run-simulation"
import { resultToTable } from "lib/shared/result-to-table"
import { getSpiceWithPaddedSim } from "lib/shared/get-spice-with-sim"
import type { PlatformConfig } from "@tscircuit/props"

export const registerSimulate = (program: Command) => {
  const simulateCommand = program
    .command("simulate")
    .description("Run a simulation")

  simulateCommand
    .command("analog")
    .description("Run an analog SPICE simulation")
    .argument("<file>", "Path to tscircuit tsx or circuit json file")
    .option("--disable-parts-engine", "Disable the parts engine")
    .action(async (file: string, options: { disablePartsEngine?: boolean }) => {
      const platformConfig: PlatformConfig | undefined =
        options.disablePartsEngine === true
          ? { partsEngineDisabled: true }
          : undefined

      const { circuitJson } = await generateCircuitJson({
        filePath: file,
        saveToFile: false,
        platformConfig,
      })
      if (!circuitJson) {
        console.log("error: Failed to generate circuit JSON")
        process.exit(1)
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
