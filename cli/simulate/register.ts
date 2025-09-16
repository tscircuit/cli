import type { Command } from "commander"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { circuitJsonToSpice } from "circuit-json-to-spice"
import { runSimulation } from "lib/eecircuit-engine/run-simulation"
import path from "node:path"
import { promises as fs } from "node:fs"
import { resultToCsv } from "lib/shared/result-to-csv"

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
      const spiceNetlist = circuitJsonToSpice(circuitJson as any)
      let spiceString = spiceNetlist.toSpiceString()

      spiceString = spiceString.replace(
        /\.END/i,
        ".tran 1us 1ms\n.probe V(N1) V(N2) V(N3)\n.END",
      )

      const result = await runSimulation(spiceString)

      const outputCsvPath = path.join(
        path.dirname(file),
        `${path.basename(file, path.extname(file))}.csv`,
      )
      const csvContent = resultToCsv(result)

      await fs.writeFile(outputCsvPath, csvContent)
      console.log(`Simulation results written to ${outputCsvPath}`)
    })
}
