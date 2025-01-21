import * as fs from "node:fs"
import * as path from "node:path"
import * as ts from "typescript"

export function isFileImportsTyped(
  snippetPath: string,
  typedImports: string[],
): boolean {
  const content = fs.readFileSync(snippetPath, "utf-8")
  const sourceFile = ts.createSourceFile(
    snippetPath,
    content,
    ts.ScriptTarget.Latest,
    true,
  )

  const imports: string[] = []

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier
      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        const importPath = moduleSpecifier.text
        if (importPath.startsWith("@tsci/")) {
          imports.push(importPath)
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return imports.every((item) => typedImports.includes(item))
}
