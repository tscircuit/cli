import path from "node:path"
import fs from "node:fs"
import { generateCircuitJson } from "../../lib/shared/generate-circuit-json"
import { analyzeCircuitJson } from "../../lib/shared/circuit-json-diagnostics"
import { getCompletePlatformConfig } from "../../lib/shared/get-complete-platform-config"
import { registerStaticAssetLoaders } from "../../lib/shared/register-static-asset-loaders"
import type {
  WorkerInputMessage,
  BuildCompletedMessage,
  WorkerLogMessage,
} from "./worker-types"
import type { PlatformConfig } from "@tscircuit/props"

const sendMessage = (message: BuildCompletedMessage | WorkerLogMessage) => {
  // Use delimiter for reliable message parsing in persistent mode
  process.stdout.write(`${JSON.stringify(message)}\n__MSG_END__\n`)
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

const handleBuildFile = async (
  filePath: string,
  outputPath: string,
  projectDir: string,
  options?: {
    ignoreErrors?: boolean
    ignoreWarnings?: boolean
    platformConfig?: unknown
  },
): Promise<BuildCompletedMessage> => {
  const errors: string[] = []
  const warnings: string[] = []

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

    const result = await generateCircuitJson({
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
      ok: false,
      errors,
      warnings,
    }
  }
}

// Persistent process mode - stays alive and processes multiple jobs via stdin
const runPersistentWorker = async () => {
  const decoder = new TextDecoder()

  // Signal that worker is ready to receive jobs
  process.stdout.write("__WORKER_READY__\n")

  const reader = Bun.stdin.stream().getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = value
    const text = decoder.decode(chunk, { stream: true })
    if (text.trim()) {
      try {
        const msg: WorkerInputMessage = JSON.parse(text)

        if (msg.message_type === "build_file") {
          const result = await handleBuildFile(
            msg.file_path,
            msg.output_path,
            msg.project_dir,
            msg.options,
          )
          sendMessage(result)
        }
      } catch (err) {
        process.stderr.write(`Worker parse error: ${err}\n`)
      }
    }
  }
}

runPersistentWorker()
