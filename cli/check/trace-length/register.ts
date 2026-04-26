import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import type { Command } from "commander"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"

type TraceLengthAnalyzer = (
  circuitJson: readonly AnyCircuitElement[],
  options: { targetPinOrNet: string },
) => { toString(): string }

const loadTraceLengthAnalyzer = async (): Promise<TraceLengthAnalyzer> => {
  const mod = (await import(
    "circuit-json-trace-length-analysis"
  )) as unknown as {
    analyzeCircuitJsonTraceLength: TraceLengthAnalyzer
  }

  return mod.analyzeCircuitJsonTraceLength
}

export const checkTraceLength = async (pinOrNetRef: string, file?: string) => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const circuitJson = await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {
      pcbDisabled: false,
      routingDisabled: false,
    } satisfies PlatformConfig,
    allowPrebuiltCircuitJson: true,
  })

  const analyzeCircuitJsonTraceLength = await loadTraceLengthAnalyzer()
  const analysis = analyzeCircuitJsonTraceLength(circuitJson, {
    targetPinOrNet: pinOrNetRef,
  })

  return analysis.toString()
}

export const registerCheckTraceLength = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("trace-length")
    .description("Analyze trace length for a pin or net")
    .argument("<pinOrNetRef>", "Pin or net target to analyze")
    .argument("[file]", "Path to the entry file")
    .action(async (pinOrNetRef: string, file?: string) => {
      try {
        const output = await checkTraceLength(pinOrNetRef, file)
        console.log(output)
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
