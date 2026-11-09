import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import { getCircuitJsonOutputDirName } from "lib/shared/circuit-json-build-cache"
import { loadBuildPresets } from "./load-build-presets"

export type BuildTarget = {
  filePath: string
  outputDirName: string
  injectedProps?: Record<string, unknown>
}

export async function getBuildTargets({
  circuitFiles,
  projectDir,
  injectedProps,
  platformConfig,
}: {
  circuitFiles: string[]
  projectDir: string
  injectedProps?: Record<string, unknown>
  platformConfig?: PlatformConfig
}): Promise<BuildTarget[]> {
  const targets: BuildTarget[] = []
  for (const filePath of circuitFiles) {
    const outputDirName = getCircuitJsonOutputDirName(
      path.relative(projectDir, filePath),
    )
    targets.push({ filePath, outputDirName, injectedProps })
    // Explicit props request one ordinary build, as before.
    if (injectedProps !== undefined) continue
    for (const preset of await loadBuildPresets({
      filePath,
      projectDir,
      platformConfig,
    }))
      targets.push({
        filePath,
        outputDirName: path.join(outputDirName, preset.name),
        injectedProps: preset.props,
      })
  }
  const outputPaths = new Set<string>()
  for (const target of targets) {
    if (outputPaths.has(target.outputDirName))
      throw new Error(`Multiple builds write to dist/${target.outputDirName}`)
    outputPaths.add(target.outputDirName)
  }
  return targets
}
