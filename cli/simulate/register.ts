import type { Command } from "commander"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { circuitJsonToSpice } from "circuit-json-to-spice"
import { runSimulation } from "lib/eecircuit-engine/run-simulation"

export const registerSimulate = (program: Command) => {
  const simulateCommand = program
    .command("simulate")
    .description("Run a simulation")

  simulateCommand
    .command("analog")
    .description("Run an analog SPICE simulation")
    .argument("<file>", "Path to the circuit file")
    .action(async (file: string) => {
      const { circuitJson } = await generateCircuitJson({
        filePath: file,
        saveToFile: false,
      })
      if (circuitJson) {
        const spiceNetlist = circuitJsonToSpice(circuitJson as any)
        let spiceString = spiceNetlist.toSpiceString()

        spiceString = spiceString.replace(
          /\.END/i,
          ".tran 1us 1ms\n.probe V(N1) V(N2) V(N3)\n.END",
        )

        const result = await runSimulation(spiceString)

        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log("error: Failed to generate circuit JSON")
      }
    })
}
