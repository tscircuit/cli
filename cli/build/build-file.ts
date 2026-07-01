import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import kleur from "kleur"
import {
  type CircuitJsonIssue,
  type CircuitJsonIssueCategory,
  analyzeCircuitJson,
  classifyCircuitJsonIssue,
} from "lib/shared/circuit-json-diagnostics"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import {
  type DrcIgnoreCounts,
  type DrcIgnoreOptions,
  filterDiagnosticsByDrcCategory,
} from "./drc-diagnostic-filter"

export type BuildDiagnostic = {
  message: string
  category: CircuitJsonIssueCategory
}

export type BuildFileOutcome = {
  ok: boolean
  circuitJson?: AnyCircuitElement[]
  hasErrors?: boolean
  ignoredDrcCount?: number
  ignoredDrcByCategory?: DrcIgnoreCounts
  errors?: string[]
  warnings?: string[]
  errorDiagnostics?: BuildDiagnostic[]
  warningDiagnostics?: BuildDiagnostic[]
  /** Fatal error that should always cause exit code 1, even with --ignore-errors */
  isFatalError?: { errorType: string; message: string }
}

export const buildFile = async (
  input: string,
  output: string,
  projectDir: string,
  options?: {
    ignoreErrors?: boolean
    ignoreWarnings?: boolean
  } & DrcIgnoreOptions & {
      platformConfig?: PlatformConfig
      injectedProps?: Record<string, unknown>
      writeOutput?: boolean
      logDiagnostics?: boolean
    },
): Promise<BuildFileOutcome> => {
  try {
    console.log("Generating circuit JSON...")

    const normalizedInputPath = input.toLowerCase().replaceAll("\\", "/")
    const isPrebuiltCircuitJson =
      normalizedInputPath.endsWith(".circuit.json") ||
      normalizedInputPath.endsWith("/circuit.json")
    let circuitJson: AnyCircuitElement[] = []

    if (isPrebuiltCircuitJson) {
      const parsed = JSON.parse(fs.readFileSync(input, "utf-8"))
      circuitJson = Array.isArray(parsed) ? parsed : []
    }

    // Get complete platform config with kicad_mod support
    const platformConfigWithCliDefaults = getPlatformConfigWithCliDefaults(
      options?.platformConfig,
    )

    if (!isPrebuiltCircuitJson) {
      const result = await generateCircuitJson({
        filePath: input,
        platformConfig: platformConfigWithCliDefaults,
        injectedProps: options?.injectedProps,
      })
      circuitJson = result.circuitJson
    }

    if (options?.writeOutput !== false) {
      fs.mkdirSync(path.dirname(output), { recursive: true })
      fs.writeFileSync(output, JSON.stringify(circuitJson, null, 2))
      console.log(
        `Circuit JSON written to ${path.relative(projectDir, output)}`,
      )
    }

    const diagnostics = analyzeCircuitJson(circuitJson)
    const filteredDiagnostics = filterDiagnosticsByDrcCategory({
      errors: diagnostics.errors,
      warnings: diagnostics.warnings,
      ignoreOptions: options,
    })

    const warningDiagnostics = options?.ignoreWarnings
      ? []
      : filteredDiagnostics.warnings.map(formatDiagnostic)
    const errorDiagnostics = options?.ignoreErrors
      ? []
      : filteredDiagnostics.errors.map(formatDiagnostic)
    const warnings = warningDiagnostics.map((diagnostic) => diagnostic.message)
    const errors = errorDiagnostics.map((diagnostic) => diagnostic.message)

    if (options?.logDiagnostics !== false) {
      if (!options?.ignoreWarnings) {
        for (const msg of warnings) {
          console.log(kleur.yellow(msg))
        }
      }

      if (!options?.ignoreErrors) {
        for (const err of filteredDiagnostics.errors) {
          const msg = formatDiagnosticMessage(err)
          console.error(kleur.red(msg))
          if (err.stack) {
            console.log(err.stack)
          }
        }
      }
    }

    return {
      ok: true,
      circuitJson,
      hasErrors:
        filteredDiagnostics.errors.length > 0 && !options?.ignoreErrors,
      ignoredDrcCount: filteredDiagnostics.ignoredCount,
      ignoredDrcByCategory: filteredDiagnostics.ignoredByCategory,
      errors,
      warnings,
      errorDiagnostics,
      warningDiagnostics,
    }
  } catch (err) {
    console.error(err)
    if (err instanceof Error) {
      logTsxExtensionHint(err, input)
      logTypeReexportHint(err, input)
    }
    // Fatal error: circuit generation itself failed (not just analysis errors)
    return {
      ok: false,
      isFatalError: {
        errorType: "circuit_generation_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      errors: [err instanceof Error ? err.message : String(err)],
      warnings: [],
    }
  }
}

const formatDiagnosticMessage = (issue: CircuitJsonIssue) =>
  issue.message || JSON.stringify(issue)

const formatDiagnostic = (issue: CircuitJsonIssue): BuildDiagnostic => ({
  message: formatDiagnosticMessage(issue),
  category: classifyCircuitJsonIssue(issue),
})

const logTsxExtensionHint = (error: Error, entryFilePath: string) => {
  const lowerPath = entryFilePath.toLowerCase()
  const isTsEntry = lowerPath.endsWith(".ts") && !lowerPath.endsWith(".d.ts")
  const isAggregateError =
    error instanceof AggregateError || String(error).includes("AggregateError")
  if (!isTsEntry || !isAggregateError) return

  const entryFileName = path.basename(entryFilePath)
  console.error(
    [
      "",
      `It looks like "${entryFileName}" is a ".ts" file. tscircuit component files must use the ".tsx" extension.`,
      "Try renaming the file to .tsx and re-running the build.",
      "",
    ].join("\n"),
  )
}

const TYPE_REEXPORT_ERROR_REGEX =
  /SyntaxError: export '([^']+)' not found in '([^']+)'/

const logTypeReexportHint = (error: Error, entryFilePath: string) => {
  const match = String(error).match(TYPE_REEXPORT_ERROR_REGEX)
  if (!match) return
  const [, exportName, fromSpecifier] = match
  const entryFileName = path.basename(entryFilePath)
  console.error(
    [
      "",
      `It looks like "${entryFileName}" re-exports the type-only symbol "${exportName}" from "${fromSpecifier}" without the "type" modifier.`,
      "Type-only exports must be re-exported with `export type { ... }`.",
      "Try rewriting the statement as:",
      `  export type { ${exportName} } from "${fromSpecifier}"`,
      "",
    ].join("\n"),
  )
}
