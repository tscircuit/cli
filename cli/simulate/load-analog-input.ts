import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { gunzipSync } from "node:zlib"
import type { PipelineModeling } from "@tscircuit/pcb-spice-pipeline"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"

export const loadAnalogInput = async ({
  file,
  projectDir,
  platformConfig,
}: {
  file: string
  projectDir: string
  platformConfig: PlatformConfig
}) => {
  if (!file.endsWith(".json") && !file.endsWith(".json.gz")) {
    return {
      ...(await generateCircuitJson({
        filePath: resolve(file),
        projectDir,
        platformConfig,
      })),
      baseDir: projectDir,
    }
  }

  const readJson = async (filename: string) => {
    const bytes = await readFile(filename)
    return JSON.parse(
      (filename.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString(),
    )
  }
  const entry = await readJson(resolve(file))
  const isPipelineEntry =
    !Array.isArray(entry) && typeof entry?.circuit === "string"
  const circuitJson = isPipelineEntry
    ? await readJson(resolve(dirname(resolve(file)), entry.circuit))
    : entry
  if (!Array.isArray(circuitJson)) {
    throw new Error(
      "Expected Circuit JSON records or a pipeline JSON entry with a circuit path",
    )
  }
  return {
    circuitJson: circuitJson as AnyCircuitElement[],
    modeling: (isPipelineEntry ? (entry.modeling ?? entry) : undefined) as
      | PipelineModeling
      | undefined,
    baseDir: isPipelineEntry ? dirname(resolve(file)) : projectDir,
  }
}
