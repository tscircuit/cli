import fs from "node:fs"
import path from "node:path"
import { parentPort } from "node:worker_threads"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import { analyzeCircuitJson } from "../../lib/shared/circuit-json-diagnostics"
import { generateCircuitJson } from "../../lib/shared/generate-circuit-json"
import { getCircuitJsonToGltfOptions } from "../../lib/shared/get-circuit-json-to-gltf-options"
import { getCompletePlatformConfig } from "../../lib/shared/get-complete-platform-config"
import { registerStaticAssetLoaders } from "../../lib/shared/register-static-asset-loaders"
import { convertModelUrlsToFileUrls } from "./convert-model-urls-to-file-urls"
import type {
  BuildCompletedMessage,
  BuildGlbCompletedMessage,
  WorkerInputMessage,
  WorkerLogMessage,
} from "./worker-types"

if (!parentPort) {
  throw new Error("This file must be run as a worker thread")
}

const sendMessage = (
  message: BuildCompletedMessage | BuildGlbCompletedMessage | WorkerLogMessage,
) => {
  parentPort!.postMessage(message)
}

const workerLog = (...args: unknown[]) => {
  const line = args
    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
    .join(" ")
  const message: WorkerLogMessage = {
    message_type: "worker_log",
    log_lines: [line],
  }
  sendMessage(message)
}

const viewToArrayBuffer = (view: ArrayBufferView): ArrayBuffer => {
  const copy = new Uint8Array(view.byteLength)
  copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))
  return copy.buffer
}

const normalizeToUint8Array = (value: unknown): Uint8Array => {
  if (value instanceof Uint8Array) {
    return value
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value)
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(viewToArrayBuffer(value as ArrayBufferView))
  }

  throw new Error(
    "Expected Uint8Array, ArrayBuffer, or ArrayBufferView for GLB",
  )
}

const handleBuildFile = async (
  filePath: string,
  outputPath: string,
  projectDir: string,
  options?: {
    ignoreErrors?: boolean
    ignoreWarnings?: boolean
    platformConfig?: unknown
    profile?: boolean
  },
): Promise<BuildCompletedMessage> => {
  const errors: string[] = []
  const warnings: string[] = []
  const startedAt = options?.profile ? performance.now() : 0

  try {
    // Change to project directory for proper module resolution
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

    const result = isPrebuiltCircuitJson
      ? {
          circuitJson: (() => {
            const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"))
            return Array.isArray(parsed) ? parsed : []
          })(),
        }
      : await generateCircuitJson({
          filePath,
          platformConfig: completePlatformConfig,
        })

    // Write circuit JSON to disk (not sent through IPC to avoid memory issues)
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

    // Don't include circuit_json in response - it's already on disk
    return {
      message_type: "build_completed",
      file_path: filePath,
      output_path: outputPath,
      circuit_json_path: outputPath,
      ok: !hasErrors,
      errors,
      warnings,
      durationMs: options?.profile ? performance.now() - startedAt : undefined,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    errors.push(errorMsg)
    workerLog(`Build error: ${errorMsg}`)

    // Fatal error: circuit generation itself failed (not just analysis errors)
    return {
      message_type: "build_completed",
      file_path: filePath,
      output_path: outputPath,
      circuit_json_path: outputPath,
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

const handleBuildGlb = async (
  circuitJsonPath: string,
  glbOutputPath: string,
  projectDir: string,
): Promise<BuildGlbCompletedMessage> => {
  try {
    process.chdir(projectDir)

    workerLog(
      `Converting ${path.relative(projectDir, circuitJsonPath)} to GLB...`,
    )

    const circuitJsonRaw = fs.readFileSync(circuitJsonPath, "utf-8")
    const parsed = JSON.parse(circuitJsonRaw)

    if (!Array.isArray(parsed)) {
      throw new Error("Expected circuit.json to contain an array")
    }

    const circuitJson = parsed as AnyCircuitElement[]
    const circuitJsonWithFileUrls = convertModelUrlsToFileUrls(circuitJson)
    const glbBuffer = await convertCircuitJsonToGltf(
      circuitJsonWithFileUrls,
      getCircuitJsonToGltfOptions({ format: "glb" }),
    )

    const glbData = normalizeToUint8Array(glbBuffer)
    fs.mkdirSync(path.dirname(glbOutputPath), { recursive: true })
    fs.writeFileSync(glbOutputPath, Buffer.from(glbData))

    return {
      message_type: "build_glb_completed",
      circuit_json_path: circuitJsonPath,
      glb_output_path: glbOutputPath,
      ok: true,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    workerLog(`GLB conversion error: ${errorMsg}`)
    return {
      message_type: "build_glb_completed",
      circuit_json_path: circuitJsonPath,
      glb_output_path: glbOutputPath,
      ok: false,
      error: errorMsg,
    }
  }
}

// Listen for messages from the main thread
parentPort.on("message", async (msg: WorkerInputMessage) => {
  if (msg.message_type === "build_file") {
    const result = await handleBuildFile(
      msg.file_path,
      msg.output_path,
      msg.project_dir,
      msg.options,
    )
    sendMessage(result)
  } else if (msg.message_type === "build_glb") {
    const result = await handleBuildGlb(
      msg.circuit_json_path,
      msg.glb_output_path,
      msg.project_dir,
    )
    sendMessage(result)
  }
})
