import type { Command } from "commander"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getSpiceWithPaddedSim } from "lib/shared/get-spice-with-sim"
import { runSimulation } from "lib/eecircuit-engine/run-simulation"
import {
  embedSimulationInCircuitJson,
  validateSimulationResults,
} from "lib/shared/embed-simulation-in-circuit-json"
import { convertCircuitJsonToSchematicSimulationSvg } from "circuit-to-svg"
import { promises as fs } from "node:fs"
import path from "node:path"
import kleur from "kleur"
import type { PlatformConfig } from "@tscircuit/props"

export const registerSimulateVisualize = (simulateCommand: Command) => {
  simulateCommand
    .command("visualize")
    .description(
      "Generate an SVG visualization of analog simulation with schematic overlay",
    )
    .argument(
      "<file>",
      "Path to tscircuit tsx or circuit json file",
    )
    .option("-o, --output <path>", "Output SVG file path")
    .option("--disable-parts-engine", "Disable the parts engine")
    .action(
      async (
        file: string,
        options: {
          output?: string
          disablePartsEngine?: boolean
        },
      ) => {
        try {
          const platformConfig: PlatformConfig | undefined =
            options.disablePartsEngine === true
              ? { partsEngineDisabled: true }
              : undefined

          // Step 1: Generate circuit JSON
          console.log(
            kleur.cyan("📋 Generating circuit JSON from source..."),
          )
          const { circuitJson } = await generateCircuitJson({
            filePath: file,
            saveToFile: false,
            platformConfig,
          })

          if (!circuitJson) {
            console.error(
              kleur.red("❌ Failed to generate circuit JSON"),
            )
            process.exit(1)
          }

          // Step 2: Generate SPICE netlist with simulation parameters
          console.log(
            kleur.cyan(
              "⚡ Generating SPICE netlist with simulation parameters...",
            ),
          )
          const spiceString = getSpiceWithPaddedSim(circuitJson)

          // Step 3: Run simulation
          console.log(
            kleur.cyan("🔬 Running analog simulation..."),
          )
          const simulationOutput = await runSimulation(spiceString)

          // Check for simulation errors
          if (simulationOutput.errors && simulationOutput.errors.length > 0) {
            console.error(
              kleur.yellow(
                "⚠️  Simulation produced warnings/errors:",
              ),
            )
            simulationOutput.errors.forEach((err) =>
              console.error(kleur.yellow(`   ${err}`)),
            )
          }

          // Step 4: Validate simulation results
          const validation = validateSimulationResults(
            simulationOutput.result,
          )
          if (!validation.valid) {
            console.error(
              kleur.red(`❌ Invalid simulation results: ${validation.message}`),
            )
            process.exit(1)
          }

          console.log(
            kleur.green(`✓ ${validation.message}`),
          )

          // Step 5: Embed simulation data into circuit JSON
          console.log(
            kleur.cyan(
              "🔗 Embedding simulation data into circuit visualization...",
            ),
          )
          const {
            circuitJson: circuitJsonWithSim,
            simulation_experiment_id,
            simulation_transient_voltage_graph_ids,
          } = await embedSimulationInCircuitJson(
            circuitJson,
            simulationOutput,
          )

          // Step 6: Generate SVG visualization
          console.log(
            kleur.cyan("🎨 Generating simulation visualization SVG..."),
          )
          const svgContent = convertCircuitJsonToSchematicSimulationSvg({
            circuitJson: circuitJsonWithSim,
            simulation_experiment_id,
            simulation_transient_voltage_graph_ids,
          })

          // Step 7: Write to file
          const outputPath =
            options.output ??
            path.join(
              path.dirname(file),
              `${path.basename(file, path.extname(file))}-simulation.svg`,
            )

          await fs.writeFile(outputPath, svgContent)

          console.log(
            kleur.green(
              `✅ Simulation visualization exported to ${kleur.bold(outputPath)}`,
            ),
          )
          console.log(
            kleur.gray(
              `   Experiment ID: ${simulation_experiment_id}`,
            ),
          )
          console.log(
            kleur.gray(
              `   Voltage graphs: ${simulation_transient_voltage_graph_ids.length}`,
            ),
          )

          process.exit(0)
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error)
          console.error(kleur.red(`❌ Error: ${message}`))
          process.exit(1)
        }
      },
    )
}
