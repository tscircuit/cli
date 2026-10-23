import type { Command } from "commander"
import { registerReturnCurrentSimulation } from "./register-return-current"
import { runAnalogSimulation } from "./run-analog-simulation"

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
    .action(runAnalogSimulation)
}
