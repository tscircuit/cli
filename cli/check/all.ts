import { findBitmapShorts } from "@tscircuit/check-shorts"
import { analyzeAllPlacements } from "@tscircuit/circuit-json-placement-analysis"
import { analyzeRouting } from "@tscircuit/circuit-json-routing-analysis"
import { analyzeSchematicPlacement } from "@tscircuit/circuit-json-schematic-placement-analysis"
import { categorizeErrorOrWarning } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, CircuitJson } from "circuit-json"
import {
  type CircuitJsonIssue,
  analyzeCircuitJson,
} from "lib/shared/circuit-json-diagnostics"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "./shared"

export type CheckCategory =
  | "netlist"
  | "schematic_placement"
  | "pcb_placement"
  | "shorts"
  | "routing"
  | "build"

export type CheckIssue = {
  category: CheckCategory
  type: string
  severity: "error" | "warning"
  message: string
  component_names: string[]
  coordinates: {
    x: number
    y: number
    unit: "mm"
    space: "pcb" | "schematic"
  } | null
  suggested_fix: string | null
}

export type CheckAllReport = {
  schema_version: 1
  success: boolean
  summary: { errors: number; warnings: number; total: number }
  checks: Array<{
    name: CheckCategory
    status: "passed" | "failed" | "warning" | "skipped"
    issue_count: number
  }>
  issues: CheckIssue[]
}

const CHECK_CATEGORIES: CheckCategory[] = [
  "netlist",
  "schematic_placement",
  "pcb_placement",
  "shorts",
  "routing",
  "build",
]

type JsonRecord = Record<string, any>

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))

const uniqueStrings = (values: unknown[]) => [
  ...new Set(values.filter((value): value is string => Boolean(value))),
]

const getIssueType = (issue: CircuitJsonIssue) =>
  issue.warning_type ?? issue.error_type ?? issue.type ?? "unknown_issue"

const getDiagnosticCategory = (issue: CircuitJsonIssue): CheckCategory => {
  const category = categorizeErrorOrWarning(issue)
  if (category === "placement") return "pcb_placement"
  if (category === "routing") return "routing"
  if (
    category === "netlist" ||
    category === "source" ||
    category === "pin_specification"
  ) {
    return "netlist"
  }
  return "build"
}

const getComponentLookup = (circuitJson: AnyCircuitElement[]) => {
  const bySourceId = new Map<string, string>()
  const byPcbId = new Map<string, string>()
  const pcbCoordinates = new Map<string, { x: number; y: number }>()
  const componentNames = new Set<string>()

  for (const element of circuitJson) {
    const record = element as JsonRecord
    if (
      record.type === "source_component" &&
      typeof record.source_component_id === "string" &&
      typeof record.name === "string"
    ) {
      bySourceId.set(record.source_component_id, record.name)
      componentNames.add(record.name)
    }
  }

  for (const element of circuitJson) {
    const record = element as JsonRecord
    if (record.type !== "pcb_component") continue
    const name = bySourceId.get(record.source_component_id)
    if (!name) continue
    if (typeof record.pcb_component_id === "string") {
      byPcbId.set(record.pcb_component_id, name)
    }
    if (
      typeof record.center?.x === "number" &&
      typeof record.center?.y === "number"
    ) {
      pcbCoordinates.set(name, record.center)
    }
  }

  return { bySourceId, byPcbId, pcbCoordinates, componentNames }
}

const getDiagnosticComponentNames = (
  issue: CircuitJsonIssue,
  lookup: ReturnType<typeof getComponentLookup>,
) =>
  uniqueStrings([
    issue.component_name,
    issue.name,
    lookup.bySourceId.get(issue.source_component_id),
    lookup.byPcbId.get(issue.pcb_component_id),
    ...(issue.message?.match(/\b[A-Z]{1,4}\d+\b/g) ?? []).filter((name) =>
      lookup.componentNames.has(name),
    ),
    ...[...lookup.componentNames].filter(
      (name) =>
        issue.message?.includes(`name="${name}"`) ||
        issue.message?.includes(`${name}.`) ||
        issue.message?.includes(`${name} `),
    ),
  ])

const getCoordinates = (
  value: JsonRecord,
  space: "pcb" | "schematic",
  fallback?: { x: number; y: number },
): CheckIssue["coordinates"] => {
  const coordinateCandidates = [
    value.center,
    value.position,
    value.location,
    value,
  ]
  for (const candidate of coordinateCandidates) {
    if (
      isRecord(candidate) &&
      typeof candidate.x === "number" &&
      typeof candidate.y === "number"
    ) {
      return { x: candidate.x, y: candidate.y, unit: "mm", space }
    }
  }
  return fallback ? { ...fallback, unit: "mm", space } : null
}

const getSuggestedFix = (
  issue: JsonRecord,
  category?: CheckCategory,
): string | null => {
  for (const key of [
    "suggested_fix",
    "suggestion",
    "suggested_move",
    "recommendation",
  ]) {
    if (typeof issue[key] === "string") return issue[key]
  }
  if (category === "netlist") return "correct the referenced pins and nets"
  if (category === "pcb_placement") {
    return "move or rotate the referenced PCB components"
  }
  if (category === "routing") return "reroute near the reported coordinates"
  if (category === "build") return "fix the diagnostic and rebuild"
  return null
}

const normalizeSchematicIssue = (issue: JsonRecord): CheckIssue => {
  const boxes = [
    issue.schematicBox,
    issue.firstComponent,
    issue.secondComponent,
    issue.diodeSchematicBox,
    issue.resistorSchematicBox,
  ].filter(isRecord)
  const componentNames = uniqueStrings([
    issue.componentName,
    ...boxes.map((box) => box.sourceComponentName),
    ...(Array.isArray(issue.pairs)
      ? issue.pairs.flatMap((pair: JsonRecord) => [
          pair.comp1Name,
          pair.comp2Name,
        ])
      : []),
  ])
  const firstBox = boxes[0]
  const firstMove = Array.isArray(issue.correctionSuggestions)
    ? issue.correctionSuggestions[0]
    : Array.isArray(issue.moves)
      ? issue.moves[0]
      : issue.suggestion
  const suggestedFix = isRecord(firstMove)
    ? `move ${firstMove.targetComponentName ?? firstMove.componentName ?? "component"} to (${firstMove.newSchX}, ${firstMove.newSchY})`
    : typeof issue.suggestedSchWidth === "number"
      ? `set schematic width to ${issue.suggestedSchWidth}mm`
      : typeof issue.suggestedSchHeight === "number"
        ? `set schematic height to ${issue.suggestedSchHeight}mm`
        : getSuggestedFix(issue)

  return {
    category: "schematic_placement",
    type: issue.lineItemType ?? "schematic_placement_issue",
    severity: "warning",
    message: issue.message ?? issue.lineItemType ?? "Schematic placement issue",
    component_names: componentNames,
    coordinates: firstBox
      ? getCoordinates({ x: firstBox.schX, y: firstBox.schY }, "schematic")
      : getCoordinates({ x: issue.schX, y: issue.schY }, "schematic"),
    suggested_fix: suggestedFix,
  }
}

const deduplicateIssues = (issues: CheckIssue[]) => {
  const seen = new Set<string>()
  return issues.filter((issue) => {
    const key = JSON.stringify([
      issue.type,
      issue.message,
      issue.component_names.slice().sort(),
      issue.coordinates,
    ])
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const createCheckAllReport = async (
  circuitJson: AnyCircuitElement[],
): Promise<CheckAllReport> => {
  const lookup = getComponentLookup(circuitJson)
  const diagnostics = analyzeCircuitJson(circuitJson)
  const issues: CheckIssue[] = [
    ...diagnostics.errors,
    ...diagnostics.warnings,
  ].map((issue) => {
    const category = getDiagnosticCategory(issue)
    const componentNames = getDiagnosticComponentNames(issue, lookup)
    const fallbackPcbCoordinate =
      componentNames.length === 1
        ? lookup.pcbCoordinates.get(componentNames[0]!)
        : undefined
    return {
      category,
      type: getIssueType(issue),
      severity: diagnostics.errors.includes(issue) ? "error" : "warning",
      message: issue.message ?? "",
      component_names: componentNames,
      coordinates: getCoordinates(
        issue,
        category === "pcb_placement" ||
          category === "routing" ||
          fallbackPcbCoordinate
          ? "pcb"
          : "schematic",
        fallbackPcbCoordinate,
      ),
      suggested_fix: getSuggestedFix(issue, category),
    }
  })

  const schematicAnalysis = analyzeSchematicPlacement(
    circuitJson as CircuitJson,
  )
  for (const lineItem of schematicAnalysis.getLineItems()) {
    if (lineItem.lineItemType !== "SchematicPlacementIssues") continue
    issues.push(...lineItem.issues.map(normalizeSchematicIssue))
  }

  for (const issue of analyzeAllPlacements(circuitJson).getIssues()) {
    issues.push({
      category: "pcb_placement",
      type: issue.type,
      severity: "warning",
      message: issue.summary,
      component_names: uniqueStrings([issue.componentA, issue.componentB]),
      coordinates: getCoordinates(
        {},
        "pcb",
        lookup.pcbCoordinates.get(issue.componentA),
      ),
      suggested_fix: issue.suggested_move ?? null,
    })
  }

  const shortResults = await Promise.all(
    (["top", "bottom"] as const).map((layer) =>
      findBitmapShorts(circuitJson, { mode: "gerber", layer }),
    ),
  )
  for (const short of shortResults.flat()) {
    const componentNames = uniqueStrings(
      [...short.firstOwnerLabels, ...short.secondOwnerLabels].flatMap((label) =>
        [...lookup.componentNames].filter(
          (name) => label === name || label.startsWith(`${name}.`),
        ),
      ),
    )
    issues.push({
      category: "shorts",
      type: "pcb_short",
      severity: "error",
      message: `Unintended ${short.layer} copper connection between ${short.firstOwnerLabels.join(", ") || "unknown"} and ${short.secondOwnerLabels.join(", ") || "unknown"}`,
      component_names: componentNames,
      coordinates: getCoordinates(short.center, "pcb"),
      suggested_fix: "separate the copper groups at the reported coordinates",
    })
  }

  const routingAnalysis = await analyzeRouting(circuitJson as CircuitJson)
  for (const region of routingAnalysis.getLineItems()) {
    issues.push({
      category: "routing",
      type: "congested_region",
      severity: "warning",
      message: `Routing congestion has ${region.probabilityOfFailure} probability of failure`,
      component_names: uniqueStrings(
        region.nearbyComponents.map((component) => component.name),
      ),
      coordinates: {
        x: (region.bounds.minX + region.bounds.maxX) / 2,
        y: (region.bounds.minY + region.bounds.maxY) / 2,
        unit: "mm",
        space: "pcb",
      },
      suggested_fix: "increase spacing around the congested region",
    })
  }

  const deduplicatedIssues = deduplicateIssues(issues)
  const errors = deduplicatedIssues.filter(
    (issue) => issue.severity === "error",
  ).length
  const warnings = deduplicatedIssues.length - errors

  return {
    schema_version: 1,
    success: errors === 0,
    summary: { errors, warnings, total: deduplicatedIssues.length },
    checks: CHECK_CATEGORIES.map((name) => {
      const categoryIssues = deduplicatedIssues.filter(
        (issue) => issue.category === name,
      )
      return {
        name,
        status: categoryIssues.some((issue) => issue.severity === "error")
          ? "failed"
          : categoryIssues.length > 0
            ? "warning"
            : "passed",
        issue_count: categoryIssues.length,
      }
    }),
    issues: deduplicatedIssues,
  }
}

export const checkAll = async (file?: string) => {
  try {
    const resolvedInputFilePath = await resolveCheckInputFilePath(file)
    const circuitJson = await getCircuitJsonForCheck({
      filePath: resolvedInputFilePath,
      platformConfig: {
        pcbDisabled: false,
        routingDisabled: false,
      },
      allowPrebuiltCircuitJson: true,
    })
    return createCheckAllReport(circuitJson)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const issue: CheckIssue = {
      category: "build",
      type: "build_validation_error",
      severity: "error",
      message,
      component_names: [],
      coordinates: null,
      suggested_fix: "fix the build error and rerun the check",
    }
    return {
      schema_version: 1,
      success: false,
      summary: { errors: 1, warnings: 0, total: 1 },
      checks: CHECK_CATEGORIES.map((name) => ({
        name,
        status: name === "build" ? "failed" : "skipped",
        issue_count: name === "build" ? 1 : 0,
      })),
      issues: [issue],
    }
  }
}
