import * as ts from "typescript"
import * as path from "path"
import * as fs from "fs"

interface NodeModuleDependency {
  /** The package name (e.g., "react" or "@tscircuit/core") */
  packageName: string
  /** The import path used in the source (e.g., "react/jsx-runtime") */
  importPath: string
  /** Resolved absolute file paths for this dependency */
  resolvedFiles: string[]
}

function getLocalPackages(projectDir: string): Set<string> {
  const packageJsonPath = path.join(projectDir, "package.json")
  const localPackages = new Set<string>()

  if (!fs.existsSync(packageJsonPath)) {
    return localPackages
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
    const allDeps = {
      ...packageJson.dependencies,
    }

    for (const [packageName, version] of Object.entries(allDeps)) {
      if (typeof version !== "string") continue

      const isLocalPackage =
        version.startsWith("file:") ||
        version.startsWith("link:") ||
        version.includes(".yalc")

      if (isLocalPackage) {
        localPackages.add(packageName)
      }
    }
  } catch (error) {
    console.warn("Failed to parse package.json for local packages:", error)
  }

  return localPackages
}

function getAllDependencyPackages(projectDir: string): Set<string> {
  const packageJsonPath = path.join(projectDir, "package.json")
  const allPackages = new Set<string>()

  if (!fs.existsSync(packageJsonPath)) {
    return allPackages
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
    const deps = packageJson.dependencies || {}

    for (const packageName of Object.keys(deps)) {
      allPackages.add(packageName)
    }
  } catch (error) {
    console.warn("Failed to parse package.json for dependencies:", error)
  }

  return allPackages
}

/**
 * Extracts all node_modules imports from a source file
 */
export function getNodeModuleImports(filePath: string): string[] {
  const absolutePath = path.resolve(filePath)

  if (!fs.existsSync(absolutePath)) {
    return []
  }

  const content = fs.readFileSync(absolutePath, "utf-8")
  const sourceFile = ts.createSourceFile(
    absolutePath,
    content,
    ts.ScriptTarget.Latest,
    true,
  )

  const imports = new Set<string>()

  function visit(node: ts.Node) {
    // Handle static imports and exports
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier
      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        const importPath = moduleSpecifier.text
        // Include any import that is not relative (doesn't start with . or /)
        if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
          imports.add(importPath)
        }
      }
    }

    // Handle dynamic imports
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const argument = node.arguments[0]
      if (argument && ts.isStringLiteral(argument)) {
        const importPath = argument.text
        if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
          imports.add(importPath)
        }
      }
    }

    // Handle require() calls
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require"
    ) {
      const argument = node.arguments[0]
      if (argument && ts.isStringLiteral(argument)) {
        const importPath = argument.text
        if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
          imports.add(importPath)
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return Array.from(imports)
}

/**
 * Extracts the package name from an import path
 * e.g., "react/jsx-runtime" -> "react"
 * e.g., "@tscircuit/core/components" -> "@tscircuit/core"
 */
function getPackageNameFromImport(importPath: string): string {
  if (importPath.startsWith("@")) {
    // Scoped package
    const parts = importPath.split("/")
    return `${parts[0]}/${parts[1]}`
  }
  // Regular package
  return importPath.split("/")[0]
}

/**
 * Resolves a node_modules import to actual file paths
 * Searches in both the project's node_modules and parent directories for hoisted packages
 */
export function resolveNodeModuleImport({
  importPath,
  projectDir,
  searchFromDir,
}: {
  importPath: string
  projectDir: string
  searchFromDir?: string
}): string[] {
  const packageName = getPackageNameFromImport(importPath)

  // Try to find the package in multiple locations:
  // 1. Project's node_modules
  // 2. If searchFromDir is provided (e.g., inside a local package), search upwards
  const searchPaths: string[] = [
    path.join(projectDir, "node_modules", packageName),
  ]

  if (searchFromDir) {
    // Walk up the directory tree from searchFromDir to find node_modules
    let currentDir = path.dirname(searchFromDir)
    const projectDirNormalized = path.normalize(projectDir)

    while (currentDir.startsWith(projectDirNormalized)) {
      const candidatePath = path.join(currentDir, "node_modules", packageName)
      if (!searchPaths.includes(candidatePath)) {
        searchPaths.push(candidatePath)
      }

      const parentDir = path.dirname(currentDir)
      if (parentDir === currentDir) break
      currentDir = parentDir
    }
  }

  let packageDir: string | undefined
  for (const candidatePath of searchPaths) {
    if (fs.existsSync(candidatePath)) {
      packageDir = candidatePath
      break
    }
  }

  if (!packageDir) {
    return []
  }

  // Read package.json to find entry points
  const packageJsonPath = path.join(packageDir, "package.json")
  if (!fs.existsSync(packageJsonPath)) {
    return []
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
  const resolvedFiles: string[] = []

  // If importing a subpath (e.g., "react/jsx-runtime")
  if (importPath !== packageName) {
    const subpath = importPath.slice(packageName.length + 1)
    const possiblePaths = [
      path.join(packageDir, subpath),
      path.join(packageDir, `${subpath}.js`),
      path.join(packageDir, `${subpath}.mjs`),
      path.join(packageDir, `${subpath}.ts`),
      path.join(packageDir, `${subpath}.tsx`),
      path.join(packageDir, subpath, "index.js"),
      path.join(packageDir, subpath, "index.mjs"),
      path.join(packageDir, subpath, "index.ts"),
      path.join(packageDir, subpath, "index.tsx"),
    ]

    for (const p of possiblePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        resolvedFiles.push(p)
        break
      }
    }
  }

  // Helper to resolve potentially nested export values
  // exports["."].import can be a string or an object like { types: "...", default: "..." }
  const resolveExportValue = (value: unknown): string | undefined => {
    if (typeof value === "string") return value
    if (value && typeof value === "object" && "default" in value) {
      const defaultVal = (value as Record<string, unknown>).default
      if (typeof defaultVal === "string") return defaultVal
      // Handle double-nested: { default: { types: "...", default: "..." } }
      if (
        defaultVal &&
        typeof defaultVal === "object" &&
        "default" in defaultVal
      ) {
        const nestedDefault = (defaultVal as Record<string, unknown>).default
        if (typeof nestedDefault === "string") return nestedDefault
      }
    }
    return undefined
  }

  // Main entry points from package.json
  const entryPoints = [
    packageJson.main,
    packageJson.module,
    resolveExportValue(packageJson.exports?.["."]?.default),
    resolveExportValue(packageJson.exports?.["."]?.import),
    resolveExportValue(packageJson.exports?.["."]?.require),
  ].filter((entry): entry is string => typeof entry === "string")

  for (const entry of entryPoints) {
    const entryPath = path.join(packageDir, entry)
    if (fs.existsSync(entryPath) && fs.statSync(entryPath).isFile()) {
      resolvedFiles.push(entryPath)
    }
  }

  // Fallback to common entry point locations
  if (resolvedFiles.length === 0) {
    const fallbackPaths = [
      path.join(packageDir, "index.js"),
      path.join(packageDir, "index.mjs"),
      path.join(packageDir, "index.ts"),
      path.join(packageDir, "index.tsx"),
      path.join(packageDir, "dist", "index.js"),
      path.join(packageDir, "dist", "index.mjs"),
      path.join(packageDir, "lib", "index.js"),
      path.join(packageDir, "src", "index.ts"),
      path.join(packageDir, "src", "index.tsx"),
    ]

    for (const p of fallbackPaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        resolvedFiles.push(p)
        break
      }
    }
  }

  return resolvedFiles
}

/**
 * Recursively collects all node_modules files used by a source file and its dependencies
 */
export function collectAllNodeModuleDependencies(
  entryFilePath: string,
  projectDir: string,
  maxDepth = 10,
): Map<string, string[]> {
  const visited = new Set<string>()
  const nodeModuleFiles = new Map<string, string[]>() // importPath -> resolved files

  function processFile(filePath: string, depth: number) {
    if (depth > maxDepth || visited.has(filePath)) {
      return
    }
    visited.add(filePath)

    const imports = getNodeModuleImports(filePath)

    for (const importPath of imports) {
      if (!nodeModuleFiles.has(importPath)) {
        const resolvedFiles = resolveNodeModuleImport({
          importPath,
          projectDir,
          searchFromDir: filePath,
        })
        if (resolvedFiles.length > 0) {
          nodeModuleFiles.set(importPath, resolvedFiles)

          // Recursively process the resolved files
          for (const resolvedFile of resolvedFiles) {
            processFile(resolvedFile, depth + 1)
          }
        }
      }
    }

    // Also process local dependencies
    const localDeps = getLocalDependencies(filePath)
    for (const localDep of localDeps) {
      processFile(localDep, depth)
    }
  }

  function getLocalDependencies(filePath: string): string[] {
    const absolutePath = path.resolve(filePath)
    const baseDir = path.dirname(absolutePath)

    if (!fs.existsSync(absolutePath)) {
      return []
    }

    const content = fs.readFileSync(absolutePath, "utf-8")
    const sourceFile = ts.createSourceFile(
      absolutePath,
      content,
      ts.ScriptTarget.Latest,
      true,
    )

    const dependencies: string[] = []

    function visit(node: ts.Node) {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier
        if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text
          if (importPath.startsWith(".")) {
            const resolved = resolveLocalImport(importPath, baseDir)
            if (resolved) dependencies.push(resolved)
          }
        }
      }
      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
    return dependencies
  }

  function resolveLocalImport(
    importPath: string,
    baseDir: string,
  ): string | null {
    const extensions = [".tsx", ".ts", ".jsx", ".js", ".mjs"]
    const resolvedPath = path.resolve(baseDir, importPath)

    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      return resolvedPath
    }

    for (const ext of extensions) {
      const pathWithExt = resolvedPath + ext
      if (fs.existsSync(pathWithExt)) {
        return pathWithExt
      }
    }

    if (
      fs.existsSync(resolvedPath) &&
      fs.statSync(resolvedPath).isDirectory()
    ) {
      for (const ext of extensions) {
        const indexPath = path.join(resolvedPath, `index${ext}`)
        if (fs.existsSync(indexPath)) {
          return indexPath
        }
      }
    }

    return null
  }

  processFile(entryFilePath, 0)
  return nodeModuleFiles
}

/**
 * Directories that should be excluded when collecting package files
 */
const EXCLUDED_PACKAGE_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".turbo",
  "coverage",
  ".cache",
  "tmp",
  "temp",
])

/**
 * Recursively collects all files from a local package directory
 * Prioritizes transpiled files (dist/, build/) over source files to avoid
 * path alias resolution issues in the browser
 */
function collectLocalPackageFiles(packageDir: string): string[] {
  // First, check if there's a dist/ or build/ directory with transpiled files
  const buildDirs = ["dist", "build"]

  // Check build directories in order
  for (const dirName of buildDirs) {
    const dirPath = path.join(packageDir, dirName)
    if (fs.existsSync(dirPath)) {
      const files = walkDirectory(dirPath, new Set())
      if (files.length > 0) {
        // Also include package.json for metadata
        const packageJsonPath = path.join(packageDir, "package.json")
        if (fs.existsSync(packageJsonPath)) {
          files.push(packageJsonPath)
        }
        return files
      }
    }
  }

  // Fall back to collecting all source files (excluding build directories)
  return walkDirectory(packageDir, EXCLUDED_PACKAGE_DIRECTORIES)
}

function walkDirectory(dir: string, excludedDirs: Set<string>): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) return files

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      // Skip excluded directories
      if (excludedDirs.has(entry.name)) {
        continue
      }
      files.push(...walkDirectory(fullPath, excludedDirs))
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

const RUNTIME_PROVIDED_PACKAGES = new Set([
  "react",
  "react-dom",
  "react/jsx-runtime",
  "tscircuit",
  "@tscircuit/core",
  "@tscircuit/props",
  "tslib",
])

/**
 * Check if a package is provided by the runtime and should not be uploaded
 */
function isRuntimeProvidedPackage(packageName: string): boolean {
  // Check exact match
  if (RUNTIME_PROVIDED_PACKAGES.has(packageName)) {
    return true
  }

  // Check if it's a subpath of a runtime package
  for (const runtimePkg of RUNTIME_PROVIDED_PACKAGES) {
    if (packageName.startsWith(`${runtimePkg}/`)) {
      return true
    }
  }

  return false
}

export function getAllNodeModuleFilePaths(
  entryFilePath: string,
  projectDir: string,
): string[] {
  const localPackages = getLocalPackages(projectDir)
  const allDependencyPackages = getAllDependencyPackages(projectDir)

  // Early return if no dependencies are defined
  if (allDependencyPackages.size === 0) {
    return []
  }

  // Collect all node_modules dependencies from the entry file
  const dependencies = collectAllNodeModuleDependencies(
    entryFilePath,
    projectDir,
  )

  // Ensure all direct dependencies are included even if not imported
  for (const packageName of allDependencyPackages) {
    if (dependencies.has(packageName)) continue

    const resolvedFiles = resolveNodeModuleImport({
      importPath: packageName,
      projectDir,
      searchFromDir: entryFilePath,
    })

    if (resolvedFiles.length > 0) {
      dependencies.set(packageName, resolvedFiles)
    }
  }

  const processedPackages = new Set<string>()
  const allFiles = new Set<string>()

  // When there are local packages, we also need to upload their transitive dependencies
  const hasLocalPackages = localPackages.size > 0

  // Iterate through all discovered dependencies
  for (const [importPath, resolvedFiles] of dependencies.entries()) {
    const packageName = getPackageNameFromImport(importPath)

    // Check if this is a local package
    const isLocalPackage = localPackages.has(packageName)

    // Check if this package is in the project's dependencies
    const isProjectDependency = allDependencyPackages.has(packageName)

    // Skip pre-supplied packages UNLESS they are local packages being developed
    if (isRuntimeProvidedPackage(packageName) && !isLocalPackage) {
      continue
    }

    // Upload packages that are:
    // 1. Explicitly listed in the project's dependencies (direct deps)
    // 2. Local packages
    // 3. Transitive dependencies when there are local packages
    const shouldUpload =
      isProjectDependency || isLocalPackage || hasLocalPackages
    if (!shouldUpload) {
      continue
    }

    // Upload project dependencies and local packages
    if (!processedPackages.has(packageName)) {
      processedPackages.add(packageName)

      // Use the first resolved file to find the package directory
      // The resolved files are the actual entry points we found
      if (resolvedFiles.length > 0) {
        const firstResolvedFile = resolvedFiles[0]
        // Find the package directory by walking up from the resolved file
        let packageDir = path.dirname(firstResolvedFile)

        // Walk up until we find the package.json for this package
        while (packageDir.includes("node_modules")) {
          const packageJsonPath = path.join(packageDir, "package.json")
          if (fs.existsSync(packageJsonPath)) {
            try {
              const pkgJson = JSON.parse(
                fs.readFileSync(packageJsonPath, "utf-8"),
              )
              if (pkgJson.name === packageName) {
                // Found the right package directory
                break
              }
            } catch {
              // Continue searching
            }
          }
          const parentDir = path.dirname(packageDir)
          if (parentDir === packageDir) break
          packageDir = parentDir
        }

        // Collect all files from the package directory
        if (fs.existsSync(packageDir)) {
          const packageFiles = collectLocalPackageFiles(packageDir)
          packageFiles.forEach((file) => allFiles.add(file))
        }
      }
    }
  }

  return Array.from(allFiles)
}
