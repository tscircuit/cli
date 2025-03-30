import * as fs from "node:fs"
import * as path from "node:path"
import {
  projectConfigSchema,
  TscircuitProjectConfig,
} from "./project-config-schema"

export const defineConfig = (config: TscircuitProjectConfig) => {
  return config
}

export const CONFIG_FILENAME = "tscircuit.config.json"

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
