import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import { analyzeCircuitJson } from "../../../lib/shared/circuit-json-diagnostics"
import { generateCircuitJson } from "../../../lib/shared/generate-circuit-json"
import { getCompletePlatformConfig } from "../../../lib/shared/get-complete-platform-config"
import { registerStaticAssetLoaders } from "../../../lib/shared/register-static-asset-loaders"
import type { BuildServiceMethods } from "../types"

const workerLog = (...args: unknown[]) => {
  const line = args
    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
    .join(" ")
  if (typeof postMessage === "function") {
    postMessage({ message_type: "rpc_log", log_lines: [line] })
  }
}

export const buildService: BuildServiceMethods = {
  async buildFile(args) {
    const { filePath, outputPath, projectDir, options } = args
    const errors: string[] = []
    const warnings: string[] = []

    try {
      process.chdir(projectDir)

      workerLog(
        `Generating circuit JSON for ${path.relative(projectDir, filePath)}...`,
      )

      await registerStaticAssetLoaders()

      const completePlatformConfig = getCompletePlatformConfig(
        options?.platformConfig as PlatformConfig,
      )

      const result = await generateCircuitJson({
        filePath,
        platformConfig: completePlatformConfig,
      })

      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(outputPath, JSON.stringify(result.circuitJson, null, 2))

      workerLog(
        `Circuit JSON written to ${path.relative(projectDir, outputPath)}`,
      )

      const diagnostics = analyzeCircuitJson(result.circuitJson)

      if (!options?.ignoreWarnings) {
        for (const warn of diagnostics.warnings) {
          const msg = warn.message || JSON.stringify(warn)
          warnings.push(msg)
          workerLog(`Warning: ${msg}`)
        }
      }

      if (!options?.ignoreErrors) {
        for (const err of diagnostics.errors) {
          const msg = err.message || JSON.stringify(err)
          errors.push(msg)
          workerLog(`Error: ${msg}`)
        }
      }

      const hasErrors = diagnostics.errors.length > 0 && !options?.ignoreErrors

      return {
        filePath,
        outputPath,
        circuitJsonPath: outputPath,
        ok: !hasErrors,
        errors,
        warnings,
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      errors.push(errorMsg)
      workerLog(`Build error: ${errorMsg}`)

      return {
        filePath,
        outputPath,
        circuitJsonPath: outputPath,
        ok: false,
        isFatalError: {
          errorType: "circuit_generation_failed",
          message: errorMsg,
        },
        errors,
        warnings,
      }
    }
  },
}
