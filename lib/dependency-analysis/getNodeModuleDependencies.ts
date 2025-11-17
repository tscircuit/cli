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

/**
 * Gets a set of local package names from the project's package.json
 * Local packages are those installed via yalc (file:.yalc/...) or file: protocol
 */
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
      const versionStr = version as string
      // Check if it's a local package (file:, link:, or .yalc reference)
      if (
        versionStr.startsWith("file:") ||
        versionStr.startsWith("link:") ||
        versionStr.includes(".yalc")
      ) {
        localPackages.add(packageName)
      }
    }
  } catch (error) {
    // If we can't parse package.json, return empty set
    console.warn("Failed to parse package.json:", error)
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
 * Recursively collects all files from a package directory
 */
function collectPackageFiles(packageDir: string): string[] {
  const files: string[] = []

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return

    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      // Skip common directories that shouldn't be uploaded
      if (
        entry.isDirectory() &&
        (entry.name === "node_modules" ||
          entry.name === ".git" ||
          entry.name === ".next" ||
          entry.name === "dist" ||
          entry.name === "build" ||
          entry.name === ".turbo" ||
          entry.name === "coverage")
      ) {
        continue
      }

      if (entry.isFile()) {
        files.push(fullPath)
      } else if (entry.isDirectory()) {
        walk(fullPath)
      }
    }
  }

  walk(packageDir)
  return files
}

/**
 * Gets all unique node_modules file paths that need to be uploaded
 * Only includes files from local packages (installed via yalc or file: protocol)
 */
export function getAllNodeModuleFilePaths(
  entryFilePath: string,
  projectDir: string,
): string[] {
  const dependencies = collectAllNodeModuleDependencies(
    entryFilePath,
    projectDir,
  )
  const allFiles = new Set<string>()
  const localPackages = getLocalPackages(projectDir)

  // If no local packages are defined, return empty array
  if (localPackages.size === 0) {
    return []
  }

  // Collect all packages (including those not directly imported)
  const processedPackages = new Set<string>()

  for (const [importPath, files] of dependencies.entries()) {
    const packageName = getPackageNameFromImport(importPath)

    // Only include files if this package is a local package
    if (!localPackages.has(packageName) || processedPackages.has(packageName)) {
      continue
    }

    processedPackages.add(packageName)
    const packageDir = path.join(projectDir, "node_modules", packageName)

    // For local packages, collect all files in the package directory
    if (fs.existsSync(packageDir)) {
      const packageFiles = collectPackageFiles(packageDir)
      for (const file of packageFiles) {
        allFiles.add(file)
      }
    }
  }

  return Array.from(allFiles)
}
