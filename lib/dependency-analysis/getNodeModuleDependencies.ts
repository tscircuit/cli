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
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
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
 */
export function resolveNodeModuleImport(
  importPath: string,
  projectDir: string,
): string[] {
  const packageName = getPackageNameFromImport(importPath)
  const packageDir = path.join(projectDir, "node_modules", packageName)

  if (!fs.existsSync(packageDir)) {
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

  // Main entry points from package.json
  const entryPoints = [
    packageJson.main,
    packageJson.module,
    packageJson.types,
    packageJson.typings,
    packageJson.exports?.["."]?.default,
    packageJson.exports?.["."]?.import,
    packageJson.exports?.["."]?.require,
  ].filter(Boolean)

  for (const entry of entryPoints) {
    const entryPath = path.join(packageDir, entry as string)
    if (fs.existsSync(entryPath) && fs.statSync(entryPath).isFile()) {
      resolvedFiles.push(entryPath)
    }
  }

  // Fallback to common entry files
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
        const resolvedFiles = resolveNodeModuleImport(importPath, projectDir)
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
 * Excludes common build/cache directories to reduce upload size
 */
function collectLocalPackageFiles(packageDir: string): string[] {
  const files: string[] = []

  function walkDirectory(dir: string) {
    if (!fs.existsSync(dir)) return

    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (EXCLUDED_PACKAGE_DIRECTORIES.has(entry.name)) {
          continue
        }
        walkDirectory(fullPath)
      } else if (entry.isFile()) {
        files.push(fullPath)
      }
    }
  }

  walkDirectory(packageDir)
  return files
}

export function getAllNodeModuleFilePaths(
  entryFilePath: string,
  projectDir: string,
): string[] {
  const localPackages = getLocalPackages(projectDir)

  // Early return if no local packages are defined
  if (localPackages.size === 0) {
    return []
  }

  // Collect all node_modules dependencies from the entry file
  const dependencies = collectAllNodeModuleDependencies(
    entryFilePath,
    projectDir,
  )

  const processedPackages = new Set<string>()
  const allFiles = new Set<string>()

  // Iterate through all discovered dependencies
  for (const [importPath] of dependencies.entries()) {
    const packageName = getPackageNameFromImport(importPath)

    // Skip if not a local package or already processed
    if (!localPackages.has(packageName) || processedPackages.has(packageName)) {
      continue
    }

    processedPackages.add(packageName)
    const packageDir = path.join(projectDir, "node_modules", packageName)

    // Collect all files from the local package directory
    if (fs.existsSync(packageDir)) {
      const packageFiles = collectLocalPackageFiles(packageDir)
      packageFiles.forEach((file) => allFiles.add(file))
    }
  }

  return Array.from(allFiles)
}
