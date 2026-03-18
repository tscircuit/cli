import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getCompletePlatformConfig } from "lib/shared/get-complete-platform-config"
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
}: {
  filePath: string
  platformConfig: PlatformConfig
  allowPrebuiltCircuitJson?: boolean
}): Promise<AnyCircuitElement[]> => {
  if (allowPrebuiltCircuitJson && isCircuitJsonFile(filePath)) {
    const parsedJson = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    return Array.isArray(parsedJson) ? parsedJson : []
  }

  const completePlatformConfig = getCompletePlatformConfig(platformConfig)

  const { circuitJson } = await generateCircuitJson({
    filePath,
    platformConfig: completePlatformConfig,
  })

  return circuitJson as AnyCircuitElement[]
}
