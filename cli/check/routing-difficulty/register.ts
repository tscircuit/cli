import { analyzeRouting } from "@tscircuit/circuit-json-routing-analysis"
import type { PlatformConfig } from "@tscircuit/props"
import type { Command } from "commander"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"

export const checkRoutingDifficulty = async (file?: string) => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const circuitJson = await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {
      pcbDisabled: false,
      routingDisabled: true,
    } satisfies PlatformConfig,
    allowPrebuiltCircuitJson: true,
  })

  const analysis = await analyzeRouting(circuitJson)
  return analysis.getString()
}

export const registerCheckRoutingDifficulty = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("routing-difficulty")
    .description("Analyze routing difficulty")
    .argument("[file]", "Path to the entry file")
    .action(async (file?: string) => {
      try {
        const output = await checkRoutingDifficulty(file)
        console.log(output)
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
