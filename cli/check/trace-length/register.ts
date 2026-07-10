import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import type { Command } from "commander"
import path from "node:path"
import {
  parseAutorouterDumpSrjMode,
  parseAutorouterTimeout,
  type AutorouterDiagnosticsOptions,
} from "lib/shared/autorouter-diagnostics"
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

type CheckTraceLengthOptions = {
  autorouterDebug?: boolean
  autorouterTimeout?: string
  autorouterDebugDir?: string
  autorouterDumpSrj?: string | boolean
}

const getAutorouterDiagnosticsOptions = (
  options: CheckTraceLengthOptions = {},
): AutorouterDiagnosticsOptions | undefined => {
  const timeoutMs = options.autorouterTimeout
    ? parseAutorouterTimeout(options.autorouterTimeout)
    : undefined
  const dumpSrj = parseAutorouterDumpSrjMode(options.autorouterDumpSrj)
  const debugDir = options.autorouterDebugDir
    ? path.resolve(process.cwd(), options.autorouterDebugDir)
    : path.resolve(process.cwd(), "dist", "autorouter-debug")

  return {
    enabled: options.autorouterDebug,
    timeoutMs,
    debugDir,
    dumpSrj,
    logOnError: true,
    longRunningLogThresholdMs: 10_000,
  }
}

export const checkTraceLength = async (
  pinOrNetRef: string,
  file?: string,
  options: CheckTraceLengthOptions = {},
) => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const circuitJson = await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {
      pcbDisabled: false,
      routingDisabled: false,
    } satisfies PlatformConfig,
    allowPrebuiltCircuitJson: true,
    autorouterDiagnostics: getAutorouterDiagnosticsOptions(options),
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
    .option(
      "--autorouter-debug",
      "Log autorouting phase diagnostics during circuit generation",
    )
    .option(
      "--autorouter-timeout <duration>",
      'Abort an autorouting phase after a duration, e.g. "120s" or "2m"',
    )
    .option(
      "--autorouter-debug-dir <path>",
      "Directory for autorouting debug artifacts (default: dist/autorouter-debug)",
    )
    .option(
      "--autorouter-dump-srj [mode]",
      'Dump SimpleRouteJson inputs/outputs: "all", "failed", or "phase:<index>" (default: failed)',
    )
    .action(
      async (
        pinOrNetRef: string,
        file?: string,
        options?: CheckTraceLengthOptions,
      ) => {
        try {
          const output = await checkTraceLength(pinOrNetRef, file, options)
          console.log(output)
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error))
          process.exit(1)
        }
      },
    )
}
