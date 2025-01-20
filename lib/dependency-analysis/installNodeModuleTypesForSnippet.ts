import * as fs from "node:fs"
import * as path from "node:path"
import * as ts from "typescript"

interface SnippetApiResponse {
  snippet: {
    dts: string
  }
}

export async function installNodeModuleTypesForSnippet(snippetPath: string) {
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

  let projectRoot = path.dirname(snippetPath)
  while (projectRoot !== path.parse(projectRoot).root) {
    if (fs.existsSync(path.join(projectRoot, "package.json"))) {
      break
    }
    projectRoot = path.dirname(projectRoot)
  }

  for (const importPath of imports) {
    const [owner, name] = importPath.replace("@tsci/", "").split(".")
    try {
      const response = await fetch(
        `https://registry-api.tscircuit.com/snippets/get?owner_name=${owner}&unscoped_name=${name}`,
      )

      if (!response.ok) {
        console.warn(`Failed to fetch types for ${importPath}`)
        continue
      }

      const data: SnippetApiResponse = await response.json()

      if (data.snippet.dts) {
        const packageDir = path.join(
          projectRoot,
          "node_modules",
          "@tsci",
          `${owner}.${name}`,
        )
        fs.mkdirSync(packageDir, { recursive: true })

        fs.writeFileSync(path.join(packageDir, "index.d.ts"), data.snippet.dts)
      }
    } catch (error) {
      console.warn(`Error fetching types for ${importPath}:`, error)
    }
  }

  return imports
}
