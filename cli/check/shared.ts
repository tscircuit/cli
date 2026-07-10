import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import type { AutorouterDiagnosticsOptions } from "lib/shared/autorouter-diagnostics"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import { isCircuitJsonFile } from "lib/shared/is-circuit-json-file"

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
}: {
  filePath: string
  platformConfig: PlatformConfig
  allowPrebuiltCircuitJson?: boolean
  autorouterDiagnostics?: AutorouterDiagnosticsOptions
}): Promise<AnyCircuitElement[]> => {
  if (allowPrebuiltCircuitJson && isCircuitJsonFile(filePath)) {
    const parsedJson = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    return Array.isArray(parsedJson) ? parsedJson : []
  }

  const platformConfigWithCliDefaults =
    getPlatformConfigWithCliDefaults(platformConfig)

  const { circuitJson } = await generateCircuitJson({
    filePath,
    platformConfig: platformConfigWithCliDefaults,
    autorouterDiagnostics,
  })

  return circuitJson as AnyCircuitElement[]
}
