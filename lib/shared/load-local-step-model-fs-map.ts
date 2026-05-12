import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"

const isRemoteUrl = (value: string) => /^https?:\/\//i.test(value)

export async function loadLocalStepModelFsMap(
  circuitJson: AnyCircuitElement[],
) {
  const fsMap: Record<string, string> = {}

  for (const element of circuitJson as any[]) {
    if (!element || typeof element !== "object") continue

    const modelUrl = element.model_step_url
    if (typeof modelUrl !== "string" || modelUrl.length === 0) continue
    if (isRemoteUrl(modelUrl) || fsMap[modelUrl]) continue

    const localPath = path.resolve(process.cwd(), modelUrl)
    if (!existsSync(localPath)) continue

    fsMap[modelUrl] = await readFile(localPath, "utf-8")
  }

  return fsMap
}
