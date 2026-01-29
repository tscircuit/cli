import type { PlatformConfig } from "@tscircuit/props"
import { getPlatformConfig, type FilesystemCacheEngine, type PartsEngineCacheKey } from "@tscircuit/eval"
import fs from "node:fs"
import path from "node:path"

const CACHE_DIR = ".tscircuit/cache/parts-engine"

/**
 * Parses the cache key and extracts ftype and the normalized JSON key.
 */
function parseKey(key: string): { ftype: string | null; jsonKey: string } {
  const prefix = "parts-engine:"
  const jsonPart = key.startsWith(prefix) ? key.slice(prefix.length) : key

  try {
    const parsed = JSON.parse(jsonPart)
    return { ftype: parsed.ftype || null, jsonKey: jsonPart }
  } catch {
    return { ftype: null, jsonKey: key }
  }
}

/**
 * Creates a filesystem cache engine that persists to .tscircuit/cache/
 * Each ftype has a single JSON file containing a map of all cache entries for that type.
 */
function createFilesystemCacheEngine(projectDir: string): FilesystemCacheEngine {
  const cacheDir = path.join(projectDir, CACHE_DIR)

  return {
    get: (key: string) => {
      const { ftype, jsonKey } = parseKey(key)
      if (!ftype) return null

      const filePath = path.join(cacheDir, `${ftype}.json`)
      try {
        const fileContent = fs.readFileSync(filePath, "utf-8")
        const cacheMap = JSON.parse(fileContent) as Record<string, unknown>
        const entry = cacheMap[jsonKey]
        if (entry === undefined) return null
        // Return as string since the interface expects string
        return JSON.stringify(entry)
      } catch {
        return null
      }
    },
    set: (key: string, value: string) => {
      const { ftype, jsonKey } = parseKey(key)
      if (!ftype) return

      const filePath = path.join(cacheDir, `${ftype}.json`)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })

      let cacheMap: Record<string, unknown> = {}
      try {
        const fileContent = fs.readFileSync(filePath, "utf-8")
        cacheMap = JSON.parse(fileContent)
      } catch {
        // File doesn't exist or is invalid, start fresh
      }

      // Parse the value so we store proper JSON, not double-stringified
      try {
        cacheMap[jsonKey] = JSON.parse(value)
      } catch {
        cacheMap[jsonKey] = value
      }
      fs.writeFileSync(filePath, JSON.stringify(cacheMap, null, 2))
    },
  }
}

/**
 * Get a complete platform config with KiCad parsing support, filesystem caching, and any user overrides.
 */
export function getCompletePlatformConfig(
  userConfig?: PlatformConfig,
  options?: { projectDir?: string }
): PlatformConfig {
  const projectDir = options?.projectDir ?? process.cwd()
  const filesystemCache = createFilesystemCacheEngine(projectDir)
  
  const basePlatformConfig = getPlatformConfig({ filesystemCache })

  const defaultConfig: PlatformConfig = {
    ...basePlatformConfig,
    footprintFileParserMap: {
      ...basePlatformConfig.footprintFileParserMap,
      kicad_mod: {
        loadFromUrl: async (url: string) => {
          const fetchUrl = url.startsWith("/") ? `file://${url}` : url
          return basePlatformConfig.footprintFileParserMap!.kicad_mod.loadFromUrl(
            fetchUrl,
          )
        },
      },
    },
  }

  if (!userConfig) {
    return defaultConfig
  }

  return {
    ...defaultConfig,
    ...userConfig,
    footprintFileParserMap: {
      ...defaultConfig.footprintFileParserMap,
      ...userConfig.footprintFileParserMap,
    },
  }
}
