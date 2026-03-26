import {
  analyzeAllPlacements,
  analyzeComponentPlacement,
} from "@tscircuit/circuit-json-placement-analysis"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import type { Command } from "commander"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"

export const checkPlacement = async (file?: string, refdes?: string) => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const circuitJson = (await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {
      pcbDisabled: false,
      routingDisabled: true,
    } satisfies PlatformConfig,
    allowPrebuiltCircuitJson: true,
  })) as AnyCircuitElement[]

  if (refdes) {
    return analyzeComponentPlacement(circuitJson, refdes).getString()
  }

  return analyzeAllPlacements(circuitJson).getString()
}

export const registerCheckPlacement = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("placement")
    .description("Partially build and validate the placement")
    .argument("[file]", "Path to the entry file")
    .argument("[refdes]", "Optional refdes to scope the check")
    .action(async (file?: string, refdes?: string) => {
      try {
        const output = await checkPlacement(file, refdes)
        console.log(output)
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
