import type { Command } from "commander"
import { getVersion } from "lib/getVersion"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"
import {
  PREFLIGHT_FAIL_ON_LEVELS,
  PREFLIGHT_FORMATS,
  type PreflightFailOn,
  type PreflightFormat,
  formatPreflightSarif,
  formatPreflightText,
  runPreflight,
} from "./preflight"

interface CheckAllOptions {
  format?: string
  failOn?: string
}

const parseOption = <T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
  flag: string,
): T => {
  if (value === undefined) return fallback
  if ((allowed as readonly string[]).includes(value)) return value as T
  throw new Error(`${flag} must be one of: ${allowed.join(", ")}`)
}

export const checkAll = async (
  file?: string,
  options: CheckAllOptions = {},
) => {
  const format = parseOption<PreflightFormat>(
    options.format,
    PREFLIGHT_FORMATS,
    "text",
    "--format",
  )
  const failOn = parseOption<PreflightFailOn>(
    options.failOn,
    PREFLIGHT_FAIL_ON_LEVELS,
    "error",
    "--fail-on",
  )

  const filePath = await resolveCheckInputFilePath(file)

  // Keep stdout machine-readable: build logs (e.g. saved autorouting
  // artifacts) go to stderr when emitting JSON or SARIF.
  const originalConsoleLog = console.log
  if (format !== "text") console.log = console.error
  let report: Awaited<ReturnType<typeof runPreflight>>
  try {
    const circuitJson = await getCircuitJsonForCheck({
      filePath,
      platformConfig: {},
      allowPrebuiltCircuitJson: true,
    })
    report = await runPreflight({ circuitJson, filePath, failOn })
  } finally {
    console.log = originalConsoleLog
  }

  let output: string
  if (format === "json") {
    output = JSON.stringify(report, null, 2)
  } else if (format === "sarif") {
    output = JSON.stringify(formatPreflightSarif(report, getVersion()), null, 2)
  } else {
    output = formatPreflightText(report)
  }

  return { output, report }
}

export const registerCheckAll = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("all")
    .description(
      "Run every check (netlist, pin specification, placement, routing, DRC, PCB style, and shorts) as one preflight",
    )
    .argument("[file]", "Path to the entry file or prebuilt circuit JSON")
    .option("--format <format>", "Output format: text, json, or sarif", "text")
    .option(
      "--fail-on <level>",
      "Exit non-zero on: error, warning, or none",
      "error",
    )
    .action(async (file?: string, options?: CheckAllOptions) => {
      try {
        const { output, report } = await checkAll(file, options)
        console.log(output)
        if (!report.ok) process.exitCode = 1
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
