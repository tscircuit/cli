import * as fs from "node:fs"
import * as path from "node:path"
import { pathToFileURL } from "node:url"
import type { PlatformConfig } from "@tscircuit/props"
import {
  projectConfigSchema,
  type TscircuitProjectConfig,
} from "./project-config-schema"

export type { TscircuitProjectConfig }

export type TscircuitRuntimeProjectConfig = TscircuitProjectConfig & {
  platformConfig?: PlatformConfig
}

export const defineConfig = (config: TscircuitRuntimeProjectConfig) => {
  return config
}

export const CONFIG_FILENAME = "tscircuit.config.json"
const CONFIG_MODULE_FILENAMES = [
  "tscircuit.config.ts",
  "tscircuit.config.js",
] as const
const ENV_FILENAMES = [".env", ".env.local"] as const
export const CONFIG_SCHEMA_URL =
  "https://cdn.jsdelivr.net/npm/@tscircuit/cli/types/tscircuit.config.schema.json"

export const DEFAULT_BOARD_FILE_PATTERNS = [
  "**/*.board.tsx",
  "**/*.circuit.tsx",
  "**/*.circuit.json",
]

const parseProjectConfigObject = (
  config: unknown,
): TscircuitRuntimeProjectConfig => {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("tscircuit config must export an object")
  }

  const { platformConfig, ...serializableConfig } = config as Record<
    string,
    unknown
  >

  const parsedConfig = projectConfigSchema.parse(serializableConfig)

  if (platformConfig === undefined) {
    return parsedConfig
  }

  return {
    ...parsedConfig,
    platformConfig: platformConfig as PlatformConfig,
  }
}

const stripWrappingQuotes = (value: string) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

const loadProjectEnv = (projectDir: string) => {
  const initialEnvKeys = new Set(Object.keys(process.env))

  for (const envFileName of ENV_FILENAMES) {
    const envPath = path.join(projectDir, envFileName)
    if (!fs.existsSync(envPath)) continue

    const envContent = fs.readFileSync(envPath, "utf8")
    for (const rawLine of envContent.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith("#")) continue

      const lineWithoutExport = line.startsWith("export ")
        ? line.slice("export ".length)
        : line
      const separatorIndex = lineWithoutExport.indexOf("=")
      if (separatorIndex <= 0) continue

      const key = lineWithoutExport.slice(0, separatorIndex).trim()
      if (!key || initialEnvKeys.has(key)) continue

      const value = stripWrappingQuotes(
        lineWithoutExport.slice(separatorIndex + 1).trim(),
      )
      process.env[key] = value
    }
  }
}

/**
 * Load the tscircuit project configuration from the file system
 */
export const loadProjectConfigSync = (
  projectDir: string = process.cwd(),
): TscircuitProjectConfig | null => {
  const configPath = path.join(projectDir, CONFIG_FILENAME)

  if (!fs.existsSync(configPath)) {
    return null
  }

  try {
    const configContent = fs.readFileSync(configPath, "utf8")
    const parsedConfig = JSON.parse(configContent)
    return projectConfigSchema.parse(parsedConfig)
  } catch (error) {
    console.error(`Error loading tscircuit config: ${error}`)
    return null
  }
}

const loadProjectConfigModule = async (
  projectDir: string,
): Promise<TscircuitRuntimeProjectConfig | null> => {
  loadProjectEnv(projectDir)

  for (const configFileName of CONFIG_MODULE_FILENAMES) {
    const configPath = path.join(projectDir, configFileName)
    if (!fs.existsSync(configPath)) continue

    try {
      const moduleUrl = pathToFileURL(configPath)
      const stat = fs.statSync(configPath)
      moduleUrl.searchParams.set("tsci", String(stat.mtimeMs))
      const importedModule = await import(moduleUrl.href)
      const exportedConfig =
        importedModule.default ?? importedModule.config ?? importedModule
      return parseProjectConfigObject(exportedConfig)
    } catch (error) {
      console.error(`Error loading ${configFileName}: ${error}`)
      return null
    }
  }

  return null
}

export const loadRuntimeProjectConfig = async (
  projectDir: string = process.cwd(),
): Promise<TscircuitRuntimeProjectConfig | null> => {
  const jsonConfig = loadProjectConfigSync(projectDir)
  const moduleConfig = await loadProjectConfigModule(projectDir)

  if (!jsonConfig && !moduleConfig) {
    return null
  }

  return {
    ...(jsonConfig ?? {}),
    ...(moduleConfig ?? {}),
    build: {
      ...jsonConfig?.build,
      ...moduleConfig?.build,
    },
    pcbSnapshotSettings: {
      ...jsonConfig?.pcbSnapshotSettings,
      ...moduleConfig?.pcbSnapshotSettings,
    },
  }
}

export const loadProjectConfig = (
  projectDir: string = process.cwd(),
): TscircuitProjectConfig | null => {
  return loadProjectConfigSync(projectDir)
}

export const getBoardFilePatterns = (
  projectDir: string = process.cwd(),
): string[] => {
  const config = loadProjectConfigSync(projectDir)
  const patterns = config?.includeBoardFiles?.filter((pattern) =>
    pattern.trim(),
  )

  if (patterns && patterns.length > 0) {
    return patterns
  }

  return DEFAULT_BOARD_FILE_PATTERNS
}

/**
 * Get the snapshots directory from the project config
 */
export const getSnapshotsDir = (
  projectDir: string = process.cwd(),
): string | undefined => {
  const config = loadProjectConfigSync(projectDir)
  return config?.snapshotsDir
}

/**
 * Save the tscircuit project configuration to the file system
 */
export const saveProjectConfig = (
  config: TscircuitProjectConfig | null,
  projectDir: string = process.cwd(),
): boolean => {
  const configPath = path.join(projectDir, CONFIG_FILENAME)

  try {
    const configWithSchema = {
      $schema: CONFIG_SCHEMA_URL,
      ...(config ?? {}),
    }
    fs.writeFileSync(configPath, JSON.stringify(configWithSchema, null, 2))
    return true
  } catch (error) {
    console.error(`Error saving tscircuit config: ${error}`)
    return false
  }
}
