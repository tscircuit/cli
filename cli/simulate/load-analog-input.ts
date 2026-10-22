import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { gunzipSync } from "node:zlib"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import {
  getSourceFilesystemMd5Hash,
  readCurrentCircuitJsonBuild,
} from "lib/shared/circuit-json-build-cache"
import { getOrGenerateCircuitJson } from "lib/shared/get-or-generate-circuit-json"
import { registerStaticAssetLoaders } from "lib/shared/register-static-asset-loaders"

export const loadAnalogInput = async ({
  file,
  projectDir,
  platformConfig,
}: {
  file: string
  projectDir: string
  platformConfig: PlatformConfig
}) => {
  if (file.endsWith(".json")) {
    const jsonEntry = JSON.parse(await readFile(resolve(file), "utf8"))
    if (Array.isArray(jsonEntry)) {
      return {
        circuitJson: jsonEntry as AnyCircuitElement[],
        isPipelineJsonEntry: false,
      }
    }
    if (typeof jsonEntry?.circuit !== "string") {
      throw new Error(
        "Expected Circuit JSON or a pipeline JSON entry with a circuit path",
      )
    }
    const circuitPath = resolve(dirname(resolve(file)), jsonEntry.circuit)
    const bytes = await readFile(circuitPath)
    const circuitJson: AnyCircuitElement[] = JSON.parse(
      circuitPath.endsWith(".gz")
        ? gunzipSync(bytes).toString()
        : bytes.toString(),
    )
    if (!Array.isArray(circuitJson)) {
      throw new Error("Expected an array of Circuit JSON records")
    }
    return { circuitJson, isPipelineJsonEntry: true }
  }

  const cachedBuild = readCurrentCircuitJsonBuild({
    filePath: file,
    sourceFilesystemMd5Hash: getSourceFilesystemMd5Hash(file),
  })
  if (cachedBuild) {
    return { circuitJson: cachedBuild.circuitJson, isPipelineJsonEntry: false }
  }

  registerStaticAssetLoaders(platformConfig, projectDir)
  const entry: { circuitJson?: AnyCircuitElement[] } = await import(
    pathToFileURL(resolve(file)).href
  )
  if (Array.isArray(entry.circuitJson)) {
    return { circuitJson: entry.circuitJson, isPipelineJsonEntry: false }
  }
  const { circuitJson } = await getOrGenerateCircuitJson({
    filePath: resolve(file),
    projectDir,
    saveToFile: false,
    platformConfig,
  })
  return { circuitJson, isPipelineJsonEntry: false }
}
