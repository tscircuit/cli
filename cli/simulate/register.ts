import type { Command } from "commander"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { runSimulation } from "lib/eecircuit-engine/run-simulation"
import { resultToTable } from "lib/shared/result-to-table"
import { getSpiceWithPaddedSim } from "lib/shared/get-spice-with-sim"

export const registerSimulate = (program: Command) => {
  const simulateCommand = program
    .command("simulate")
    .description("Run a simulation")

  simulateCommand
    .command("analog")
    .description("Run an analog SPICE simulation")
    .argument("<file>", "Path to tscircuit tsx or circuit json file")
    .action(async (file: string) => {
      const { circuitJson } = await generateCircuitJson({
        filePath: file,
        saveToFile: false,
      })
      if (!circuitJson) {
        console.log("error: Failed to generate circuit JSON")
        return
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
    })
}
