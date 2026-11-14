import path from "node:path"
import { runAllPinSpecificationChecks } from "@tscircuit/checks"
import { analyzeAllPlacements } from "@tscircuit/circuit-json-placement-analysis"
import { analyzeSchematicPlacement } from "@tscircuit/circuit-json-schematic-placement-analysis"
import { categorizeErrorOrWarning } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, CircuitJson } from "circuit-json"
import {
  type CircuitJsonIssue,
  analyzeCircuitJson,
} from "lib/shared/circuit-json-diagnostics"
import { loadPcbStyleAnalysis } from "../pcb-style/register"
import { getCheckShortLayers } from "../shorts/get-check-short-layers"
import { loadCheckShorts } from "../shorts/register"

export const PREFLIGHT_FORMATS = ["text", "json", "sarif"] as const
export const PREFLIGHT_FAIL_ON_LEVELS = ["error", "warning", "none"] as const

export type PreflightFormat = (typeof PREFLIGHT_FORMATS)[number]
export type PreflightFailOn = (typeof PREFLIGHT_FAIL_ON_LEVELS)[number]
export type PreflightSeverity = "error" | "warning"

export interface PreflightDiagnostic {
  severity: PreflightSeverity
  category: string
  type: string
  message: string
}

export interface PreflightReport {
  ok: boolean
  failOn: PreflightFailOn
  file: string
  summary: {
    errors: number
    warnings: number
    byCategory: Record<string, { errors: number; warnings: number }>
  }
  diagnostics: PreflightDiagnostic[]
}

const COPPER_ELEMENT_TYPES = new Set([
  "pcb_smtpad",
  "pcb_plated_hole",
  "pcb_trace",
  "pcb_via",
  "pcb_copper_pour",
])

const getIssueType = (issue: CircuitJsonIssue) =>
  issue.error_type ?? issue.warning_type ?? issue.type ?? "unknown_issue"

const getCircuitJsonDiagnosticCategory = (issue: CircuitJsonIssue) =>
  categorizeErrorOrWarning(issue)

const toCircuitJsonDiagnostics = (
  issues: CircuitJsonIssue[],
  severity: PreflightSeverity,
): PreflightDiagnostic[] =>
  issues.map((issue) => ({
    severity,
    category: getCircuitJsonDiagnosticCategory(issue),
    type: getIssueType(issue),
    message: issue.message ?? "",
  }))

const isWarningIssue = (issue: CircuitJsonIssue) =>
  typeof issue.warning_type === "string" ||
  (typeof issue.type === "string" && issue.type.endsWith("_warning"))

const getCircuitJsonAndPinSpecificationDiagnostics = async (
  circuitJson: AnyCircuitElement[],
) => {
  const { errors, warnings } = analyzeCircuitJson(circuitJson)
  const pinSpecificationIssues = (await runAllPinSpecificationChecks(
    circuitJson,
  )) as CircuitJsonIssue[]

  return [
    ...toCircuitJsonDiagnostics(errors, "error"),
    ...toCircuitJsonDiagnostics(warnings, "warning"),
    ...toCircuitJsonDiagnostics(
      pinSpecificationIssues.filter((issue) => !isWarningIssue(issue)),
      "error",
    ),
    ...toCircuitJsonDiagnostics(
      pinSpecificationIssues.filter(isWarningIssue),
      "warning",
    ),
  ]
}

const getPcbPlacementDiagnostics = (
  circuitJson: AnyCircuitElement[],
): PreflightDiagnostic[] => {
  if (!circuitJson.some((element) => element.type === "pcb_component")) {
    return []
  }

  return analyzeAllPlacements(circuitJson)
    .getIssues()
    .map((issue) => ({
      severity: issue.type === "suboptimal_orientation" ? "warning" : "error",
      category: "placement",
      type: `placement_${issue.type}`,
      message: issue.summary,
    }))
}

const getSchematicPlacementDiagnostics = (
  circuitJson: AnyCircuitElement[],
): PreflightDiagnostic[] => {
  if (!circuitJson.some((element) => element.type === "schematic_component")) {
    return []
  }

  return analyzeSchematicPlacement(circuitJson as CircuitJson)
    .getIssues()
    .map((issue) => ({
      severity: "warning",
      category: "schematic_placement",
      type: issue.lineItemType,
      message:
        "message" in issue
          ? issue.message
          : "firstComponent" in issue
            ? `${issue.firstComponent.sourceComponentName ?? "component"} overlaps ${issue.secondComponent.sourceComponentName ?? "component"} on the schematic`
            : issue.lineItemType,
    }))
}

const getPcbStyleDiagnostics = async (
  circuitJson: AnyCircuitElement[],
): Promise<PreflightDiagnostic[]> => {
  const traces = circuitJson.filter((element) => element.type === "pcb_trace")
  if (
    traces.length === 0 ||
    traces.some(
      (trace) =>
        !Array.isArray(trace.route) || typeof trace.pcb_trace_id !== "string",
    )
  ) {
    return []
  }

  const { analyzePcbStyle } = await loadPcbStyleAnalysis()
  return analyzePcbStyle(circuitJson as CircuitJson).issues.map((issue) => ({
    severity: "warning",
    category: "pcb_style",
    type: issue.lineItemType,
    message: `${issue.message} (trace ${issue.pcbTraceId}, layer ${issue.layer})`,
  }))
}

const formatOwnerLabels = (labels: string[]) =>
  labels.length > 0 ? labels.join(", ") : "(unknown)"

const getShortDiagnostics = async (
  circuitJson: AnyCircuitElement[],
): Promise<PreflightDiagnostic[]> => {
  const hasBoard = circuitJson.some((element) => element.type === "pcb_board")
  const hasCopper = circuitJson.some((element) =>
    COPPER_ELEMENT_TYPES.has(element.type),
  )
  if (!hasBoard || !hasCopper) return []

  const { findBitmapShorts } = await loadCheckShorts()
  const layers = getCheckShortLayers({ circuitJson, layerOption: "all" })
  const shorts = (
    await Promise.all(
      layers.map((layer) =>
        findBitmapShorts(circuitJson, { mode: "gerber", layer }),
      ),
    )
  ).flat()

  return shorts.map((short) => ({
    severity: "error",
    category: "shorts",
    type: "copper_short",
    message: `${short.layer} copper short at x=${short.center.x.toFixed(3)}mm y=${short.center.y.toFixed(3)}mm between ${formatOwnerLabels(short.firstOwnerLabels)} and ${formatOwnerLabels(short.secondOwnerLabels)}`,
  }))
}

const dedupeDiagnostics = (diagnostics: PreflightDiagnostic[]) => {
  const seen = new Set<string>()
  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.severity}\u0000${diagnostic.type}\u0000${diagnostic.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const shouldFailPreflight = (
  summary: { errors: number; warnings: number },
  failOn: PreflightFailOn,
) => {
  if (failOn === "none") return false
  if (failOn === "warning") return summary.errors + summary.warnings > 0
  return summary.errors > 0
}

export const runPreflight = async ({
  circuitJson,
  filePath,
  failOn,
}: {
  circuitJson: AnyCircuitElement[]
  filePath: string
  failOn: PreflightFailOn
}): Promise<PreflightReport> => {
  const diagnostics = dedupeDiagnostics([
    ...(await getCircuitJsonAndPinSpecificationDiagnostics(circuitJson)),
    ...getPcbPlacementDiagnostics(circuitJson),
    ...getSchematicPlacementDiagnostics(circuitJson),
    ...(await getPcbStyleDiagnostics(circuitJson)),
    ...(await getShortDiagnostics(circuitJson)),
  ]).sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1,
  )

  const byCategory: PreflightReport["summary"]["byCategory"] = {}
  for (const diagnostic of diagnostics) {
    byCategory[diagnostic.category] ??= { errors: 0, warnings: 0 }
    if (diagnostic.severity === "error") {
      byCategory[diagnostic.category]!.errors++
    } else {
      byCategory[diagnostic.category]!.warnings++
    }
  }

  const summary = {
    errors: diagnostics.filter((d) => d.severity === "error").length,
    warnings: diagnostics.filter((d) => d.severity === "warning").length,
    byCategory,
  }

  return {
    ok: !shouldFailPreflight(summary, failOn),
    failOn,
    file: path.relative(process.cwd(), filePath).split(path.sep).join("/"),
    summary,
    diagnostics,
  }
}

export const formatPreflightText = (report: PreflightReport) => {
  const lines = [
    `Preflight: ${report.ok ? "PASS" : "FAIL"} (fail-on: ${report.failOn})`,
    `Errors: ${report.summary.errors}`,
    `Warnings: ${report.summary.warnings}`,
  ]

  const categories = Object.keys(report.summary.byCategory).sort()
  if (categories.length > 0) {
    lines.push("")
    for (const category of categories) {
      const { errors, warnings } = report.summary.byCategory[category]!
      lines.push(`${category}: ${errors} error(s), ${warnings} warning(s)`)
    }
    lines.push("")
    for (const diagnostic of report.diagnostics) {
      lines.push(
        `- [${diagnostic.severity}] ${diagnostic.category}/${diagnostic.type}: ${diagnostic.message}`,
      )
    }
  }

  return lines.join("\n")
}

export const formatPreflightSarif = (
  report: PreflightReport,
  toolVersion: string,
) => {
  const rules = [
    ...new Map(
      report.diagnostics.map((diagnostic) => [
        diagnostic.type,
        {
          id: diagnostic.type,
          name: diagnostic.type,
          properties: { category: diagnostic.category },
        },
      ]),
    ).values(),
  ]

  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "tsci check all",
            informationUri: "https://github.com/tscircuit/cli",
            version: toolVersion,
            rules,
          },
        },
        results: report.diagnostics.map((diagnostic) => ({
          ruleId: diagnostic.type,
          level: diagnostic.severity,
          message: { text: diagnostic.message || diagnostic.type },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: report.file },
              },
            },
          ],
          properties: { category: diagnostic.category },
        })),
      },
    ],
  }
}
