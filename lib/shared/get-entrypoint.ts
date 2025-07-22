import * as fs from "node:fs"
import * as path from "node:path"
import { loadProjectConfig, saveProjectConfig } from "lib/project-config"
import kleur from "kleur"

type EntrypointOptions = {
  filePath?: string
  projectDir?: string
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

/**
 * Detect the main entrypoint for a tscircuit project
 *
 * Logic:
 * 1. Use provided filePath if specified
 * 2. Check tscircuit.config.json for mainEntrypoint
 * 3. Check common locations (index.tsx, index.ts, lib/index.tsx, etc.)
 * 4. Update config with detected entrypoint
 */
export const getEntrypoint = async ({
  filePath,
  projectDir = process.cwd(),
  onSuccess = (message) => console.log(message),
  onError = (message) => console.error(message),
}: EntrypointOptions): Promise<string | null> => {
  // 1. Use provided filePath if specified
  if (filePath) {
    const absolutePath = path.resolve(projectDir, filePath)
    if (fs.existsSync(absolutePath)) {
      onSuccess(
        `Using provided file: '${path.relative(projectDir, absolutePath)}'`,
      )
      return absolutePath
    }
    onError(kleur.red(`File not found: '${filePath}'`))
    return null
  }

  // 2. Check tscircuit.config.json for mainEntrypoint
  const projectConfig = loadProjectConfig(projectDir)
  if (projectConfig?.mainEntrypoint) {
    const configEntrypoint = path.resolve(
      projectDir,
      projectConfig.mainEntrypoint,
    )
    if (fs.existsSync(configEntrypoint)) {
      onSuccess(
        `Using entrypoint from tscircuit.config.json: '${path.relative(projectDir, configEntrypoint)}'`,
      )
      return configEntrypoint
    }
  }

  // 3. Check common locations
  const possibleEntrypoints = [
    path.resolve(projectDir, "index.tsx"),
    path.resolve(projectDir, "index.ts"),
    path.resolve(projectDir, "index.circuit.tsx"),
    path.resolve(projectDir, "main.tsx"),
    path.resolve(projectDir, "main.circuit.tsx"),
    path.resolve(projectDir, "lib/index.tsx"),
    path.resolve(projectDir, "lib/index.ts"),
    path.resolve(projectDir, "lib/index.circuit.tsx"),
    path.resolve(projectDir, "lib/main.tsx"),
    path.resolve(projectDir, "lib/main.circuit.tsx"),
    path.resolve(projectDir, "src/index.tsx"),
    path.resolve(projectDir, "src/index.ts"),
    path.resolve(projectDir, "src/index.circuit.tsx"),
    path.resolve(projectDir, "src/main.tsx"),
    path.resolve(projectDir, "src/main.circuit.tsx"),
  ]

  let detectedEntrypoint: string | null = null

  for (const entrypoint of possibleEntrypoints) {
    if (fs.existsSync(entrypoint)) {
      detectedEntrypoint = entrypoint
      const relativePath = path.relative(projectDir, entrypoint)
      onSuccess(`Detected entrypoint: '${relativePath}'`)

      break
    }
  }

  if (!detectedEntrypoint) {
    onError(
      kleur.red(
        "No entrypoint found. Run 'tsci init' to bootstrap a basic project or specify a file with 'tsci push <file>'",
      ),
    )
  }

  return detectedEntrypoint
}
