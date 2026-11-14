import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"

const isRemoteUrl = (value: string) => /^https?:\/\//i.test(value)

const resolveStepFilePath = (modelUrl: string, baseDir: string) => {
  const inBaseDir = path.resolve(baseDir, modelUrl)
  if (existsSync(inBaseDir)) return inBaseDir

  const cwd = process.cwd()
  if (path.resolve(baseDir) !== path.resolve(cwd)) {
    const inCwd = path.resolve(cwd, modelUrl)
    if (existsSync(inCwd)) return inCwd
  }

  return inBaseDir
}

export async function loadLocalStepModelFsMap(
  circuitJson: AnyCircuitElement[],
  baseDir = process.cwd(),
) {
  const fsMap: Record<string, string> = {}

  for (const element of circuitJson as any[]) {
    if (!element || typeof element !== "object") continue

    const modelUrl = element.model_step_url
    if (typeof modelUrl !== "string" || modelUrl.length === 0) continue
    if (isRemoteUrl(modelUrl) || fsMap[modelUrl]) continue

    const localPath = resolveStepFilePath(modelUrl, baseDir)
    if (!existsSync(localPath)) continue

    fsMap[modelUrl] = await readFile(localPath, "utf-8")
  }

  return fsMap
}
