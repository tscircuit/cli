import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import * as ts from "typescript"
import { getSourceFilePaths } from "./circuit-json-build-cache"

const CODE_FILE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"]
const RESOLVABLE_EXTENSIONS = [...CODE_FILE_EXTENSIONS, ".json"]

type ParsedSourceFile = {
  mtimeMs: number
  size: number
  content: Buffer
  /** Names declared at the top level of the file. */
  declaredNames: Set<string>
  /** Imported binding name -> module specifier. */
  importedNames: Map<string, string>
  moduleSpecifiers: string[]
}

const parsedSourceFileCache = new Map<string, ParsedSourceFile>()

const md5 = (value: string | Buffer) =>
  createHash("md5").update(value).digest("hex")

const addBindingNames = (name: ts.BindingName, names: Set<string>) => {
  if (ts.isIdentifier(name)) {
    names.add(name.text)
    return
  }
  for (const element of name.elements) {
    if (!ts.isOmittedExpression(element)) addBindingNames(element.name, names)
  }
}

const parseSourceFile = (filePath: string): ParsedSourceFile => {
  const stats = fs.statSync(filePath)
  const cached = parsedSourceFileCache.get(filePath)
  if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size)
    return cached

  const content = fs.readFileSync(filePath)
  const declaredNames = new Set<string>()
  const importedNames = new Map<string, string>()
  const moduleSpecifiers: string[] = []

  if (CODE_FILE_EXTENSIONS.includes(path.extname(filePath))) {
    const sourceFile = ts.createSourceFile(
      filePath,
      content.toString("utf-8"),
      ts.ScriptTarget.Latest,
      true,
    )
    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement)) {
        if (!ts.isStringLiteral(statement.moduleSpecifier)) continue
        const specifier = statement.moduleSpecifier.text
        const clause = statement.importClause
        if (clause?.name) importedNames.set(clause.name.text, specifier)
        const bindings = clause?.namedBindings
        if (bindings && ts.isNamespaceImport(bindings)) {
          importedNames.set(bindings.name.text, specifier)
        } else if (bindings) {
          for (const element of bindings.elements) {
            importedNames.set(element.name.text, specifier)
          }
        }
      } else if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          addBindingNames(declaration.name, declaredNames)
        }
      } else if (
        (ts.isFunctionDeclaration(statement) ||
          ts.isClassDeclaration(statement) ||
          ts.isEnumDeclaration(statement)) &&
        statement.name
      ) {
        declaredNames.add(statement.name.text)
      }
    }

    const visit = (node: ts.Node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        moduleSpecifiers.push(node.moduleSpecifier.text)
      } else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require")) &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        moduleSpecifiers.push(node.arguments[0].text)
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
  }

  const parsed = {
    mtimeMs: stats.mtimeMs,
    size: stats.size,
    content,
    declaredNames,
    importedNames,
    moduleSpecifiers,
  }
  parsedSourceFileCache.set(filePath, parsed)
  return parsed
}

const resolveLocalModule = (fromFilePath: string, specifier: string) => {
  if (!specifier.startsWith(".")) return null
  const basePath = path.resolve(path.dirname(fromFilePath), specifier)
  const candidates = [
    basePath,
    ...RESOLVABLE_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    // TypeScript lets "./router.js" refer to "./router.ts".
    ...RESOLVABLE_EXTENSIONS.map(
      (extension) => `${basePath.replace(/\.[cm]?jsx?$/, "")}${extension}`,
    ),
    ...RESOLVABLE_EXTENSIONS.map((extension) =>
      path.join(basePath, `index${extension}`),
    ),
  ]
  return (
    candidates.find(
      (candidate) =>
        fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
    ) ?? null
  )
}

/**
 * Names the function reads from an enclosing scope. Scoping is approximated:
 * any name declared anywhere inside the function counts as local.
 */
const getFreeNames = (functionSource: string): Set<string> | null => {
  for (const wrappedSource of [
    `(${functionSource})`,
    `({${functionSource}})`,
  ]) {
    const sourceFile = ts.createSourceFile(
      "algorithm-fn.ts",
      wrappedSource,
      ts.ScriptTarget.Latest,
      true,
    )
    if ((sourceFile as any).parseDiagnostics?.length) continue

    const usedNames = new Set<string>()
    const declaredNames = new Set<string>()
    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node)) {
        const parent = node.parent
        const isPropertyName =
          (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
          (ts.isPropertyAssignment(parent) && parent.name === node) ||
          (ts.isMethodDeclaration(parent) && parent.name === node) ||
          (ts.isPropertyDeclaration(parent) && parent.name === node) ||
          (ts.isGetAccessor(parent) && parent.name === node) ||
          (ts.isSetAccessor(parent) && parent.name === node) ||
          (ts.isBindingElement(parent) && parent.propertyName === node) ||
          ts.isLabeledStatement(parent) ||
          ts.isBreakOrContinueStatement(parent)
        if (!isPropertyName) usedNames.add(node.text)
      }
      if (
        ts.isParameter(node) ||
        ts.isVariableDeclaration(node) ||
        ts.isBindingElement(node)
      ) {
        addBindingNames(node.name, declaredNames)
      } else if (
        (ts.isFunctionDeclaration(node) ||
          ts.isFunctionExpression(node) ||
          ts.isClassDeclaration(node) ||
          ts.isClassExpression(node)) &&
        node.name
      ) {
        declaredNames.add(node.name.text)
      } else if (ts.isCatchClause(node) && node.variableDeclaration) {
        addBindingNames(node.variableDeclaration.name, declaredNames)
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)

    return new Set(
      [...usedNames].filter(
        (name) =>
          !declaredNames.has(name) &&
          name !== "arguments" &&
          !(name in globalThis),
      ),
    )
  }
  return null
}

const getInstalledDependencyVersions = (projectDir: string) => {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"),
    )
    const dependencyNames = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
    }).sort()
    return dependencyNames.map((dependencyName) => {
      try {
        const installedPackageJson = JSON.parse(
          fs.readFileSync(
            path.join(
              projectDir,
              "node_modules",
              dependencyName,
              "package.json",
            ),
            "utf-8",
          ),
        )
        return `${dependencyName}@${installedPackageJson.version}`
      } catch {
        return `${dependencyName}@missing`
      }
    })
  } catch {
    return []
  }
}

/**
 * Fingerprints the code a custom autorouter algorithmFn depends on, as
 * `<source hash>-<dependency hash>`. The dependency hash covers the project
 * files that define the names the function uses plus everything they import
 * locally, and installed dependency versions. When a used name can't be traced
 * to a top-level project binding (e.g. a factory argument captured in a
 * closure), every project source file is included instead.
 */
export const getAlgorithmFnFingerprint = (
  algorithmFn: Function,
  projectDir: string,
): string | null => {
  const functionSource = Function.prototype.toString.call(algorithmFn)
  // Bound and native functions all stringify to the same placeholder.
  if (functionSource.includes("[native code]")) return null
  const freeNames = getFreeNames(functionSource)
  if (!freeNames) return null

  const projectFilePaths = getSourceFilePaths(projectDir)
  const parsedFiles = new Map(
    projectFilePaths.map((filePath) => [filePath, parseSourceFile(filePath)]),
  )

  const rootFilePaths = new Set<string>()
  let hasUntracedName = false
  for (const name of freeNames) {
    let traced = false
    for (const [filePath, parsedFile] of parsedFiles) {
      if (parsedFile.declaredNames.has(name)) {
        rootFilePaths.add(filePath)
        traced = true
      }
      const specifier = parsedFile.importedNames.get(name)
      if (specifier === undefined) continue
      traced = true
      // Package imports are covered by the dependency versions.
      const resolvedPath = resolveLocalModule(filePath, specifier)
      if (resolvedPath) rootFilePaths.add(resolvedPath)
    }
    if (!traced) hasUntracedName = true
  }

  const dependencyFilePaths = new Set<string>()
  if (hasUntracedName) {
    for (const filePath of projectFilePaths) dependencyFilePaths.add(filePath)
  } else {
    const pendingFilePaths = [...rootFilePaths]
    while (pendingFilePaths.length > 0) {
      const filePath = pendingFilePaths.pop()!
      if (dependencyFilePaths.has(filePath)) continue
      dependencyFilePaths.add(filePath)
      for (const specifier of parseSourceFile(filePath).moduleSpecifiers) {
        const resolvedPath = resolveLocalModule(filePath, specifier)
        if (resolvedPath) pendingFilePaths.push(resolvedPath)
      }
    }
  }

  const dependencyHash = createHash("md5")
  for (const filePath of [...dependencyFilePaths].sort()) {
    const relativePath = path
      .relative(projectDir, filePath)
      .split(path.sep)
      .join("/")
    const { content } = parseSourceFile(filePath)
    dependencyHash.update(`${Buffer.byteLength(relativePath)}:${relativePath}`)
    dependencyHash.update(`${content.byteLength}:`)
    dependencyHash.update(content)
  }
  dependencyHash.update(getInstalledDependencyVersions(projectDir).join("\n"))

  return `${md5(functionSource).slice(0, 16)}-${dependencyHash
    .digest("hex")
    .slice(0, 16)}`
}
