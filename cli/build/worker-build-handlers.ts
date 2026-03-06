import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import { analyzeCircuitJson } from "../../lib/shared/circuit-json-diagnostics"
import { generateCircuitJson } from "../../lib/shared/generate-circuit-json"
import { getCompletePlatformConfig } from "../../lib/shared/get-complete-platform-config"
import { registerStaticAssetLoaders } from "../../lib/shared/register-static-asset-loaders"
import {
  writeGlbFromCircuitJson,
  writePreviewAssetsFromCircuitJson,
} from "./worker-output-generators"
import type { BuildCompletedMessage, BuildFileMessage } from "./worker-types"

type WorkerLogger = (...args: unknown[]) => void

const loadCircuitJsonFromInputFile = (
  filePath: string,
): AnyCircuitElement[] => {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"))
  return Array.isArray(parsed) ? parsed : []
}

export const handleBuildFile = async (
  filePath: string,
  outputPath: string,
  glbOutputPath: string | undefined,
  previewOutputDir: string | undefined,
  projectDir: string,
  options: BuildFileMessage["options"],
  workerLog: WorkerLogger,
): Promise<BuildCompletedMessage> => {
  const errors: string[] = []
  const warnings: string[] = []
  const startedAt = options?.profile ? performance.now() : 0

  try {
    process.chdir(projectDir)

    workerLog(
      `Generating circuit JSON for ${path.relative(projectDir, filePath)}...`,
    )

    await registerStaticAssetLoaders()

    const completePlatformConfig = getCompletePlatformConfig(
      options?.platformConfig as PlatformConfig,
    )

    const normalizedInputPath = filePath.toLowerCase().replaceAll("\\", "/")
    const isPrebuiltCircuitJson =
      normalizedInputPath.endsWith(".circuit.json") ||
      normalizedInputPath.endsWith("/circuit.json")

    const circuitJson = isPrebuiltCircuitJson
      ? loadCircuitJsonFromInputFile(filePath)
      : (
          await generateCircuitJson({
            filePath,
            platformConfig: completePlatformConfig,
            injectedProps: options?.injectedProps,
          })
        ).circuitJson

    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, JSON.stringify(circuitJson, null, 2))

    workerLog(
      `Circuit JSON written to ${path.relative(projectDir, outputPath)}`,
    )

    const diagnostics = analyzeCircuitJson(circuitJson)

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
    let glbOk: boolean | undefined
    let glbError: string | undefined
    let previewOk: boolean | undefined
    let previewError: string | undefined

    if (glbOutputPath && !hasErrors) {
      try {
        workerLog(
          `Converting ${path.relative(projectDir, outputPath)} to GLB in same worker...`,
        )
        await writeGlbFromCircuitJson(circuitJson, glbOutputPath)
        glbOk = true
      } catch (err) {
        glbOk = false
        glbError = err instanceof Error ? err.message : String(err)
        workerLog(`GLB conversion error: ${glbError}`)
      }
    }

    if (options?.generatePreviewAssets && !hasErrors) {
      try {
        const resolvedPreviewOutputDir =
          previewOutputDir ?? path.dirname(outputPath)
        workerLog(
          `Generating preview assets for ${path.relative(projectDir, resolvedPreviewOutputDir)} in same worker...`,
        )
        await writePreviewAssetsFromCircuitJson(
          circuitJson,
          resolvedPreviewOutputDir,
        )
        previewOk = true
      } catch (err) {
        previewOk = false
        previewError = err instanceof Error ? err.message : String(err)
        workerLog(`Preview generation error: ${previewError}`)
      }
    }

    return {
      message_type: "build_completed",
      file_path: filePath,
      output_path: outputPath,
      circuit_json_path: outputPath,
      glb_output_path: glbOutputPath,
      preview_output_dir: previewOutputDir,
      glb_ok: glbOk,
      glb_error: glbError,
      preview_ok: previewOk,
      preview_error: previewError,
      ok: !hasErrors,
      errors,
      warnings,
      durationMs: options?.profile ? performance.now() - startedAt : undefined,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    errors.push(errorMsg)
    workerLog(`Build error: ${errorMsg}`)

    return {
      message_type: "build_completed",
      file_path: filePath,
      output_path: outputPath,
      circuit_json_path: outputPath,
      glb_output_path: glbOutputPath,
      preview_output_dir: previewOutputDir,
      ok: false,
      isFatalError: {
        errorType: "circuit_generation_failed",
        message: errorMsg,
      },
      errors,
      warnings,
      durationMs: options?.profile ? performance.now() - startedAt : undefined,
    }
  }
}
