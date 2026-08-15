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

const hasCircuitJsonElementDiscriminator = (
  value: unknown,
): value is { type: string } =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  typeof value.type === "string"

const tryReadPrebuiltCircuitJson = (
  filePath: string,
): AnyCircuitElement[] | null => {
  try {
    const parsedFile: unknown = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    if (
      !Array.isArray(parsedFile) ||
      !parsedFile.every(hasCircuitJsonElementDiscriminator)
    ) {
      return null
    }

    // Circuit JSON is a discriminated element array. Full semantic checks are
    // command-specific, matching the existing *.circuit.json loading path.
    return parsedFile as AnyCircuitElement[]
  } catch {
    return null
  }
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
}: {
  filePath: string
  platformConfig: PlatformConfig
  allowPrebuiltCircuitJson?: boolean
  autorouterDiagnostics?: AutorouterDiagnosticsOptions
}): Promise<AnyCircuitElement[]> => {
  if (allowPrebuiltCircuitJson) {
    const prebuiltCircuitJson = tryReadPrebuiltCircuitJson(filePath)
    if (prebuiltCircuitJson) return prebuiltCircuitJson
  }

  if (allowPrebuiltCircuitJson && isCircuitJsonFile(filePath)) {
    const parsedJson = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    return Array.isArray(parsedJson) ? parsedJson : []
  }

  const platformConfigWithCliDefaults = getPlatformConfigWithCliDefaults(
    platformConfig,
    {
      projectDir: findCircuitProjectDir(filePath),
    },
  )

  const { circuitJson } = await getOrGenerateCircuitJson({
    filePath,
    platformConfig: platformConfigWithCliDefaults,
    autorouterDiagnostics,
  })

  return circuitJson as AnyCircuitElement[]
}
