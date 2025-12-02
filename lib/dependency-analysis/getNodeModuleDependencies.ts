import * as ts from "typescript"
import * as path from "path"
import * as fs from "fs"
import { isRuntimeProvidedPackage } from "../utils/isRuntimeProvidedPackage"
import { getPackageNameFromImport } from "../utils/getPackageNameFromImport"
import { getPackageNameFromFilePath } from "../utils/getPackageNameFromFilePath"
import { getAllDependencyPackages } from "../utils/getAllDependencyPackages"
import { findPackageDir } from "../utils/findPackageDir"
import { findPackageDirFromResolvedFile } from "../utils/findPackageDirFromResolvedFile"
import { collectPackageFiles } from "../utils/collectPackageFiles"

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
 * Resolves a node_modules import to actual file paths.
 * Searches in both the project's node_modules and parent directories for hoisted packages.
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
  const packageDir = findPackageDir({ packageName, projectDir, searchFromDir })

  if (!packageDir) {
    return []
  }

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

    if (resolvedFiles.length > 0) {
      return resolvedFiles
    }
  }

  // Read package.json to find entry points (if it exists)
  const packageJsonPath = path.join(packageDir, "package.json")
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))

      const entryPoints = [
        packageJson.main,
        packageJson.module,
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
    } catch {
      // Ignore parse errors
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
 * Recursively collects all node_modules dependencies from a source file and its local imports
 */
export function collectAllNodeModuleDependencies(
  entryFilePath: string,
  projectDir: string,
  maxDepth = 10,
): Map<string, string[]> {
  const visited = new Set<string>()
  const nodeModuleFiles = new Map<string, string[]>()

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
 * Gets all file paths from node_modules that should be uploaded for a project.
 * Only uploads packages explicitly listed in dependencies (excluding runtime-provided packages).
 */
export function getAllNodeModuleFilePaths(
  entryFilePath: string,
  projectDir: string,
): string[] {
  const allDependencyPackages = getAllDependencyPackages(projectDir)

  if (allDependencyPackages.size === 0) {
    return []
  }

  // Collect dependencies from imports in the entry file
  const dependencies = collectAllNodeModuleDependencies(
    entryFilePath,
    projectDir,
  )

  // Ensure all direct dependencies are included even if not imported
  for (const packageName of Array.from(allDependencyPackages)) {
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

  for (const [importPath, resolvedFiles] of Array.from(
    dependencies.entries(),
  )) {
    const packageName = getPackageNameFromImport(importPath)
    const isProjectDependency = allDependencyPackages.has(packageName)

    // Skip runtime-provided packages and non-project dependencies
    if (isRuntimeProvidedPackage(packageName) || !isProjectDependency) {
      continue
    }

    if (!processedPackages.has(packageName)) {
      processedPackages.add(packageName)

      if (resolvedFiles.length > 0) {
        const packageDir = findPackageDirFromResolvedFile(
          resolvedFiles[0],
          packageName,
        )

        if (packageDir && fs.existsSync(packageDir)) {
          const packageFiles = collectPackageFiles(packageDir)
          packageFiles.forEach((file) => allFiles.add(file))
        }
      }
    }
  }

  // Filter out files inside runtime-provided packages (handles transitive deps)
  return Array.from(allFiles).filter((file) => {
    const pkgName = getPackageNameFromFilePath(file)
    return !pkgName || !isRuntimeProvidedPackage(pkgName)
  })
}
