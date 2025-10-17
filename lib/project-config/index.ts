import * as fs from "node:fs"
import * as path from "node:path"
import {
  projectConfigSchema,
  type TscircuitProjectConfig,
} from "./project-config-schema"

export type { TscircuitProjectConfig }

export const defineConfig = (config: TscircuitProjectConfig) => {
  return config
}

export const CONFIG_FILENAME = "tscircuit.config.json"

export const DEFAULT_BOARD_FILE_PATTERNS = [
  "**/*.board.tsx",
  "**/*.circuit.tsx",
]

export const DEFAULT_SNAPSHOTS_DIR = "__snapshots__"

/**
 * Load the tscircuit project configuration from the file system
 */
export const loadProjectConfig = (
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

export const getBoardFilePatterns = (
  projectDir: string = process.cwd(),
): string[] => {
  const config = loadProjectConfig(projectDir)
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
export const getSnapshotsDir = (projectDir: string = process.cwd()): string => {
  const config = loadProjectConfig(projectDir)
  return config?.snapshotsDir ?? DEFAULT_SNAPSHOTS_DIR
}

/**
 * Save the tscircuit project configuration to the file system
 */
export const saveProjectConfig = (
  config: TscircuitProjectConfig,
  projectDir: string = process.cwd(),
): boolean => {
  const configPath = path.join(projectDir, CONFIG_FILENAME)

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    return true
  } catch (error) {
    console.error(`Error saving tscircuit config: ${error}`)
    return false
  }
}
