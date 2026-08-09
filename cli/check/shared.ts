import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import type { AutorouterDiagnosticsOptions } from "lib/shared/autorouter-diagnostics"
import { getOrGenerateCircuitJson } from "lib/shared/get-or-generate-circuit-json"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import { isCircuitJsonFile } from "lib/shared/is-circuit-json-file"
import { findCircuitProjectDir } from "lib/shared/circuit-json-build-cache"

export type GetCircuitJsonForCheckProgressEvent =
  | {
      phase: "reading-prebuilt"
      filePath: string
    }
  | {
      phase: "preparing-source"
      filePath: string
    }
  | {
      phase: "waiting-on-async-effect"
      filePath: string
      asyncEffectName: string
    }
  | {
      phase: "ready"
      filePath: string
      source: "prebuilt" | "cache" | "render"
    }

export const resolveCheckInputFilePath = async (file?: string) => {
  if (file) {
    return path.isAbsolute(file) ? file : path.resolve(process.cwd(), file)
  }

  const entrypoint = await getEntrypoint({
    projectDir: process.cwd(),
  })

  if (!entrypoint) {
    throw new Error("No input file provided and no entrypoint found")
  }

  return entrypoint
}

export const getCircuitJsonForCheck = async ({
  filePath,
  platformConfig,
  allowPrebuiltCircuitJson = false,
  autorouterDiagnostics,
  onProgress,
}: {
  filePath: string
  platformConfig: PlatformConfig
  allowPrebuiltCircuitJson?: boolean
  autorouterDiagnostics?: AutorouterDiagnosticsOptions
  onProgress?: (event: GetCircuitJsonForCheckProgressEvent) => void
}): Promise<AnyCircuitElement[]> => {
  if (allowPrebuiltCircuitJson && isCircuitJsonFile(filePath)) {
    onProgress?.({ phase: "reading-prebuilt", filePath })
    const parsedJson = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    onProgress?.({ phase: "ready", filePath, source: "prebuilt" })
    return Array.isArray(parsedJson) ? parsedJson : []
  }

  onProgress?.({ phase: "preparing-source", filePath })

  const platformConfigWithCliDefaults = getPlatformConfigWithCliDefaults(
    platformConfig,
    {
      projectDir: findCircuitProjectDir(filePath),
    },
  )

  const { circuitJson, cacheHit } = await getOrGenerateCircuitJson({
    filePath,
    platformConfig: platformConfigWithCliDefaults,
    autorouterDiagnostics,
    onAsyncEffectStatus: (asyncEffectName) =>
      onProgress?.({
        phase: "waiting-on-async-effect",
        filePath,
        asyncEffectName,
      }),
  })

  onProgress?.({
    phase: "ready",
    filePath,
    source: cacheHit ? "cache" : "render",
  })

  return circuitJson as AnyCircuitElement[]
}
