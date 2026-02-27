import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import kleur from "kleur"
import { analyzeCircuitJson } from "lib/shared/circuit-json-diagnostics"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getCompletePlatformConfig } from "lib/shared/get-complete-platform-config"

export type BuildFileOutcome = {
  ok: boolean
  circuitJson?: AnyCircuitElement[]
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
    platformConfig?: PlatformConfig
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
    const completePlatformConfig = getCompletePlatformConfig(
      options?.platformConfig,
    )

    if (!isPrebuiltCircuitJson) {
      const result = await generateCircuitJson({
        filePath: input,
        platformConfig: completePlatformConfig,
      })
      circuitJson = result.circuitJson
    }

    fs.mkdirSync(path.dirname(output), { recursive: true })
    fs.writeFileSync(output, JSON.stringify(circuitJson, null, 2))
    console.log(`Circuit JSON written to ${path.relative(projectDir, output)}`)

    const { errors, warnings } = analyzeCircuitJson(circuitJson)

    if (!options?.ignoreWarnings) {
      for (const warn of warnings) {
        const msg = warn.message || JSON.stringify(warn)
        console.log(kleur.yellow(msg))
      }
    }

    if (!options?.ignoreErrors) {
      for (const err of errors) {
        const msg = err.message || JSON.stringify(err)
        console.error(kleur.red(msg))
        if (err.stack) {
          console.log(err.stack)
        }
      }
    }

    if (errors.length > 0 && !options?.ignoreErrors) {
      console.error(
        kleur.red(
          `Build failed with ${errors.length} error(s). Use --ignore-errors to continue.`,
        ),
      )
      return { ok: false }
    } else {
      return {
        ok: true,
        circuitJson,
      }
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
    }
  }
}

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
