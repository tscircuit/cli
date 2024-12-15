import * as ts from "typescript"
import * as path from "path"
import * as fs from "fs"

interface DependencyAnalyzerOptions {
  baseDir: string
  includeNodeModules?: boolean
  includeCssModules?: boolean
}

class DependencyAnalyzer {
  private readonly baseDir: string
  private readonly includeNodeModules: boolean
  private readonly includeCssModules: boolean
  private readonly cache: Map<string, Set<string>> = new Map()

  constructor(options: DependencyAnalyzerOptions) {
    this.baseDir = options.baseDir
    this.includeNodeModules = options.includeNodeModules ?? false
    this.includeCssModules = options.includeCssModules ?? true
  }

  public analyze(filePath: string): Set<string> {
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath)!
    }

    const dependencies = new Set<string>()
    const sourceFile = this.createSourceFile(filePath)

    if (!sourceFile) {
      return dependencies
    }

    this.visitNode(sourceFile, dependencies)
    this.cache.set(filePath, dependencies)

    return dependencies
  }

  private createSourceFile(filePath: string): ts.SourceFile | null {
    try {
      const content = fs.readFileSync(filePath, "utf-8")
      return ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
      )
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error)
      return null
    }
  }

  private visitNode(node: ts.Node, dependencies: Set<string>): void {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier
      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        const importPath = moduleSpecifier.text
        this.addDependency(importPath, dependencies)
      }
    }

    // Check for dynamic imports
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const argument = node.arguments[0]
      if (argument && ts.isStringLiteral(argument)) {
        this.addDependency(argument.text, dependencies)
      }
    }

    ts.forEachChild(node, (child) => this.visitNode(child, dependencies))
  }

  private addDependency(importPath: string, dependencies: Set<string>): void {
    // Skip node_modules unless explicitly included
    if (!this.includeNodeModules && importPath.startsWith("node_modules")) {
      return
    }

    // Handle CSS modules if enabled
    if (this.includeCssModules && importPath.endsWith(".css")) {
      const resolvedPath = this.resolvePath(importPath)
      if (resolvedPath) {
        dependencies.add(resolvedPath)
      }
      return
    }

    // Resolve relative imports
    if (importPath.startsWith(".")) {
      const resolvedPath = this.resolvePath(importPath)
      if (resolvedPath) {
        dependencies.add(resolvedPath)
      }
    }
  }

  private resolvePath(importPath: string): string | null {
    try {
      const extensions = [".tsx", ".ts", ".jsx", ".js", ".css"]
      const resolvedPath = path.resolve(this.baseDir, importPath)

      // Try exact path first
      if (fs.existsSync(resolvedPath)) {
        return resolvedPath
      }

      // Try with extensions
      for (const ext of extensions) {
        const pathWithExt = resolvedPath + ext
        if (fs.existsSync(pathWithExt)) {
          return pathWithExt
        }
      }

      return null
    } catch (error) {
      console.error(`Error resolving path ${importPath}:`, error)
      return null
    }
  }
}

export { DependencyAnalyzer, type DependencyAnalyzerOptions }
