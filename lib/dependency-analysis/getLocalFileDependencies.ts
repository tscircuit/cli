import * as ts from "typescript"
import * as path from "path"
import * as fs from "fs"

function getLocalFileDependencies(pathToTsxFile: string): string[] {
  // Ensure absolute path
  const absolutePath = path.resolve(pathToTsxFile)
  const baseDir = path.dirname(absolutePath)

  // Read and parse the file
  const content = fs.readFileSync(absolutePath, "utf-8")
  const sourceFile = ts.createSourceFile(
    absolutePath,
    content,
    ts.ScriptTarget.Latest,
    true,
  )

  const dependencies = new Set<string>()

  // Recursively visit nodes to find imports
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier
      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        const importPath = moduleSpecifier.text
        // Only process local imports (starting with . or ..)
        if (importPath.startsWith(".")) {
          resolveAndAddDependency(importPath)
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
        if (importPath.startsWith(".")) {
          resolveAndAddDependency(importPath)
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  // Helper to resolve and add dependency paths
  function resolveAndAddDependency(importPath: string) {
    const extensions = [
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
      ".css",
      ".scss",
      ".sass",
      ".less",
    ]
    let resolvedPath = path.resolve(baseDir, importPath)

    // Check if path exists as-is
    if (fs.existsSync(resolvedPath)) {
      dependencies.add(resolvedPath)
      return
    }

    // Try with extensions
    for (const ext of extensions) {
      const pathWithExt = resolvedPath + ext
      if (fs.existsSync(pathWithExt)) {
        dependencies.add(pathWithExt)
        return
      }
    }

    // Check for index files in directories
    if (
      fs.existsSync(resolvedPath) &&
      fs.statSync(resolvedPath).isDirectory()
    ) {
      for (const ext of extensions) {
        const indexPath = path.join(resolvedPath, `index${ext}`)
        if (fs.existsSync(indexPath)) {
          dependencies.add(indexPath)
          return
        }
      }
    }
  }

  // Start the traversal
  visit(sourceFile)

  return Array.from(dependencies)
}

export { getLocalFileDependencies }
