import { analyzeSchematicPlacement } from "@tscircuit/circuit-json-schematic-placement-analysis"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement, CircuitJson } from "circuit-json"
import type { Command } from "commander"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"

export const checkSchematicPlacement = async (file?: string) => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const circuitJson = (await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {
      pcbDisabled: true,
      routingDisabled: true,
      placementDrcChecksDisabled: true,
    } satisfies PlatformConfig,
    allowPrebuiltCircuitJson: true,
  })) as AnyCircuitElement[]

  return analyzeSchematicPlacement(circuitJson as CircuitJson).getString()
}

export const registerCheckSchematicPlacement = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("schematic-placement")
    .description("Analyze schematic component placement")
    .argument("[file]", "Path to the entry file")
    .action(async (file?: string) => {
      try {
        const output = await checkSchematicPlacement(file)
        console.log(output)
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
