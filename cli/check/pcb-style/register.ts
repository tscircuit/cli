import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type {
  PcbStyleAnalysisOptions,
  PcbStyleAnalysisResult,
} from "@tscircuit/circuit-json-pcb-style-analysis"
import type { CircuitJson } from "circuit-json"
import type { Command } from "commander"
import { isCircuitJsonFile } from "lib/shared/is-circuit-json-file"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"

interface CheckPcbStyleOptions {
  json?: boolean
  svg?: string
  issueType?: string
  maxSegmentLength?: string
  angleTolerance?: string
  minStaircaseBends?: string
  minStaircaseLength?: string
  maxStairStepLength?: string
}

type PcbStyleModule = Pick<
  typeof import("@tscircuit/circuit-json-pcb-style-analysis"),
  "analyzePcbStyle" | "renderPcbStyleSvg"
>

export const PCB_STYLE_CDN_URL =
  "https://jscdn.tscircuit.com/@tscircuit/circuit-json-pcb-style-analysis/latest/+esm"

const importFromPackage = async (): Promise<PcbStyleModule> =>
  await import("@tscircuit/circuit-json-pcb-style-analysis")

export const loadPcbStyleAnalysis = async (
  options: {
    importFromCdn?: (url: string) => Promise<PcbStyleModule>
    preferCdn?: boolean
  } = {},
): Promise<PcbStyleModule> => {
  const preferCdn =
    options.preferCdn ??
    (process.env.NODE_ENV !== "test" && process.env.TSCI_TEST_MODE !== "true")
  if (!preferCdn) return importFromPackage()

  try {
    const analyzer = await (options.importFromCdn ?? ((url) => import(url)))(
      PCB_STYLE_CDN_URL,
    )
    if (
      typeof analyzer.analyzePcbStyle !== "function" ||
      typeof analyzer.renderPcbStyleSvg !== "function"
    ) {
      throw new Error("The jscdn module is missing PCB style analysis exports")
    }
    return analyzer
  } catch (cdnError) {
    try {
      return await importFromPackage()
    } catch (packageError) {
      throw new AggregateError(
        [cdnError, packageError],
        "Failed to load PCB style analysis from jscdn or the installed CLI package",
      )
    }
  }
}

const numericOption = (value: string | undefined, flag: string) => {
  if (value === undefined) return undefined
  const number = Number(value)
  if (!value.trim() || !Number.isFinite(number)) {
    throw new Error(`${flag} must be a finite number`)
  }
  return number
}

const getAnalysisOptions = (
  options: CheckPcbStyleOptions,
): PcbStyleAnalysisOptions => {
  if (
    options.issueType !== undefined &&
    !["odd-angle", "staircase"].includes(options.issueType)
  ) {
    throw new Error("--issue-type must be odd-angle or staircase")
  }
  return {
    issueTypes:
      options.issueType === "odd-angle"
        ? ["PcbTraceSegmentOddAngle"]
        : options.issueType === "staircase"
          ? ["PcbTraceStaircase"]
          : undefined,
    maxSegmentLengthMm: numericOption(
      options.maxSegmentLength,
      "--max-segment-length",
    ),
    angleToleranceDegrees: numericOption(
      options.angleTolerance,
      "--angle-tolerance",
    ),
    minStaircaseBends: numericOption(
      options.minStaircaseBends,
      "--min-staircase-bends",
    ),
    minStaircaseLengthMm: numericOption(
      options.minStaircaseLength,
      "--min-staircase-length",
    ),
    maxStairStepLengthMm: numericOption(
      options.maxStairStepLength,
      "--max-stair-step-length",
    ),
  }
}

export const checkPcbStyle = async (
  file?: string,
  options: CheckPcbStyleOptions = {},
): Promise<{
  output: string
  analysis: PcbStyleAnalysisResult
  svg: string
  svgPath: string
}> => {
  const analysisOptions = getAnalysisOptions(options)
  const { analyzePcbStyle, renderPcbStyleSvg } = await loadPcbStyleAnalysis()
  // Validate thresholds before building or routing the input board.
  analyzePcbStyle([], analysisOptions)
  const filePath = await resolveCheckInputFilePath(file)
  const svgPath = path.resolve(
    options.svg ?? path.join("checks", "check-pcb-style", "pcb.svg"),
  )
  if (!svgPath.endsWith(".svg") || svgPath === filePath) {
    throw new Error("--svg must name an SVG output file different from the input")
  }
  const input: unknown = isCircuitJsonFile(filePath)
    ? JSON.parse(await readFile(filePath, "utf8"))
    : await getCircuitJsonForCheck({
        filePath,
        platformConfig: { pcbDisabled: false, routingDisabled: false },
      })
  if (
    !Array.isArray(input) ||
    input.some(
      (item) =>
        !item ||
        typeof item !== "object" ||
        typeof item.type !== "string" ||
        (item.type === "pcb_trace" &&
          (!Array.isArray(item.route) ||
            typeof item.pcb_trace_id !== "string")),
    )
  ) {
    throw new Error(
      "Expected a Circuit JSON array; pcb_trace elements need pcb_trace_id and route",
    )
  }
  const circuitJson = input as CircuitJson
  const analysis = analyzePcbStyle(circuitJson, analysisOptions)
  const count = analysis.issues.length
  const output = [
    count === 0
      ? `No PCB style issues detected in ${path.basename(filePath)}`
      : `Detected ${count} PCB style issue${count === 1 ? "" : "s"} in ${path.basename(filePath)}`,
    ...analysis.issues.map(
      (issue) =>
        `${issue.lineItemType}: ${issue.message}\n` +
        `  Trace ${issue.pcbTraceId}, layer ${issue.layer}, circuit JSON index ${issue.circuitJsonIndex}, route ${issue.startRouteIndex} -> ${issue.endRouteIndex}`,
    ),
  ].join("\n")
  return {
    output,
    analysis,
    svg: renderPcbStyleSvg(circuitJson, analysis.issues),
    svgPath,
  }
}

export const registerCheckPcbStyle = (program: Command) => {
  program.commands
    .find((command) => command.name() === "check")!
    .command("pcb-style")
    .description("Detect long odd-angle runs and unnecessary staircase routing")
    .argument("[file]", "Path to the entry file or prebuilt circuit JSON")
    .option("--json", "Print the analysis as JSON")
    .option(
      "--svg <file>",
      "Save a highlighted overview (default: checks/check-pcb-style/pcb.svg)",
    )
    .option("--issue-type <rule>", "Select odd-angle or staircase (default: both)")
    .option("--max-segment-length <mm>", "Odd-angle length threshold (default: 5)")
    .option("--angle-tolerance <degrees>", "Allowed angle tolerance (default: 4)")
    .option("--min-staircase-bends <count>", "Minimum staircase bends (default: 6)")
    .option("--min-staircase-length <mm>", "Minimum staircase length (default: 2)")
    .option(
      "--max-stair-step-length <mm>",
      "Maximum merged step length (default: 1)",
    )
    .action(async (file?: string, options: CheckPcbStyleOptions = {}) => {
      try {
        const result = await checkPcbStyle(file, options)
        await mkdir(path.dirname(result.svgPath), { recursive: true })
        await writeFile(result.svgPath, result.svg)
        console.log(
          options.json
            ? JSON.stringify(result.analysis, null, 2)
            : result.output,
        )
        const artifactMessage = `PCB style overview written to ${result.svgPath}`
        if (options.json) console.error(artifactMessage)
        else console.log(artifactMessage)
        if (result.analysis.issues.length > 0) process.exitCode = 1
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exitCode = 1
      }
    })
}
