import * as fs from "node:fs"
import * as path from "node:path"
import { loadProjectConfig } from "lib/project-config"
import kleur from "kleur"

type EntrypointOptions = {
  filePath?: string
  projectDir?: string
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

const ALLOWED_ENTRYPOINT_NAMES = Object.freeze([
  "index.tsx",
  "index.ts",
  "index.circuit.tsx",
  "main.tsx",
  "main.circuit.tsx",
])

const MAX_SEARCH_DEPTH = 3
const MAX_RESULTS = 100

const isValidDirectory = (dirPath: string, projectDir: string): boolean => {
  const resolvedDir = path.resolve(dirPath)
  const resolvedProject = path.resolve(projectDir)
  return resolvedDir.startsWith(resolvedProject) && !resolvedDir.includes("..")
}

const findEntrypointsRecursively = (
  dir: string,
  projectDir: string,
  maxDepth: number = MAX_SEARCH_DEPTH,
  fileNames: readonly string[] = ALLOWED_ENTRYPOINT_NAMES
): string[] => {
  if (maxDepth <= 0 || !isValidDirectory(dir, projectDir)) {
    return []
  }
  
  const results: string[] = []
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (results.length >= MAX_RESULTS) break
      
      if (entry.isFile() && fileNames.includes(entry.name)) {
        const filePath = path.resolve(dir, entry.name)
        if (isValidDirectory(filePath, projectDir)) {
          results.push(filePath)
        }
      }
    }
    
    for (const entry of entries) {
      if (results.length >= MAX_RESULTS) break
      
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        const subdirPath = path.resolve(dir, entry.name)
        if (isValidDirectory(subdirPath, projectDir)) {
          results.push(...findEntrypointsRecursively(subdirPath, projectDir, maxDepth - 1, fileNames))
        }
      }
    }
  } catch {
    return []
  }
  
  return results
}


const validateProjectDir = (projectDir: string): string => {
  const resolvedDir = path.resolve(projectDir)
  if (!fs.existsSync(resolvedDir)) {
    throw new Error(`Project directory does not exist: ${projectDir}`)
  }
  return resolvedDir
}

const validateFilePath = (filePath: string, projectDir: string): string | null => {
  const absolutePath = path.resolve(projectDir, filePath)
  
  if (!absolutePath.startsWith(path.resolve(projectDir))) {
    return null
  }
  
  if (absolutePath.includes("..")) {
    return null
  }
  
  return fs.existsSync(absolutePath) ? absolutePath : null
}

export const getEntrypoint = async ({
  filePath,
  projectDir = process.cwd(),
  onSuccess = (message: string) => console.log(message),
  onError = (message: string) => console.error(message),
}: EntrypointOptions): Promise<string | null> => {
  try {
    const validatedProjectDir = validateProjectDir(projectDir)
    
    if (filePath) {
      const validatedPath = validateFilePath(filePath, validatedProjectDir)
      if (validatedPath) {
        const relativePath = path.relative(validatedProjectDir, validatedPath)
        onSuccess(`Using provided file: '${relativePath}'`)
        return validatedPath
      }
      onError(kleur.red(`File not found or invalid: '${filePath}'`))
      return null
    }

    const projectConfig = loadProjectConfig(validatedProjectDir)
    if (projectConfig?.mainEntrypoint && typeof projectConfig.mainEntrypoint === "string") {
      const validatedConfigPath = validateFilePath(projectConfig.mainEntrypoint, validatedProjectDir)
      if (validatedConfigPath) {
        const relativePath = path.relative(validatedProjectDir, validatedConfigPath)
        onSuccess(`Using entrypoint from tscircuit.config.json: '${relativePath}'`)
        return validatedConfigPath
      }
    }

    const commonLocations = [
      "index.tsx",
      "index.ts", 
      "index.circuit.tsx",
      "main.tsx",
      "main.circuit.tsx",
      "lib/index.tsx",
      "lib/index.ts",
      "lib/index.circuit.tsx",
      "lib/main.tsx",
      "lib/main.circuit.tsx",
      "src/index.tsx",
      "src/index.ts",
      "src/index.circuit.tsx",
      "src/main.tsx",
      "src/main.circuit.tsx",
    ].map(location => path.resolve(validatedProjectDir, location))
    
    const recursiveEntrypoints = findEntrypointsRecursively(validatedProjectDir, validatedProjectDir)
    const possibleEntrypoints = [...commonLocations, ...recursiveEntrypoints]

    for (const entrypoint of possibleEntrypoints) {
      if (fs.existsSync(entrypoint) && isValidDirectory(entrypoint, validatedProjectDir)) {
        const relativePath = path.relative(validatedProjectDir, entrypoint)
        onSuccess(`Detected entrypoint: '${relativePath}'`)
        return entrypoint
      }
    }

    onError(
      kleur.red(
        "No entrypoint found. Run 'tsci init' to bootstrap a basic project or specify a file with 'tsci push <file>'"
      )
    )
    return null
  } catch (error) {
    onError(kleur.red(`Error detecting entrypoint: ${error instanceof Error ? error.message : 'Unknown error'}`)) 
    return null
  }
}
