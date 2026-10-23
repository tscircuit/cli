import {
  getSourceFilesystemMd5Hash,
  readCurrentCircuitJsonBuild,
} from "./circuit-json-build-cache"
import { generateCircuitJson } from "./generate-circuit-json"

/**
 * Reuses a current `tsci build` artifact when possible. Cache misses are kept
 * read-only so command-specific partial builds cannot replace the full build.
 * The explicit build command calls `generateCircuitJson` directly to force a
 * rebuild.
 */
export const getOrGenerateCircuitJson = async (
  options: Parameters<typeof generateCircuitJson>[0],
) => {
  const sourceFilesystemMd5Hash = getSourceFilesystemMd5Hash(options.filePath)
  const cachedBuild = readCurrentCircuitJsonBuild({
    filePath: options.filePath,
    sourceFilesystemMd5Hash,
  })

  if (cachedBuild) {
    return {
      ...cachedBuild,
      rootCircuit: undefined,
      cacheHit: true,
    }
  }

  const generated = await generateCircuitJson({
    ...options,
    sourceFilesystemMd5Hash,
  })

  return {
    ...generated,
    cacheHit: false,
  }
}
