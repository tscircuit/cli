import * as fs from "node:fs"
import * as path from "node:path"
import { findImportsInSnippet } from "./findImportsInSnippet"
import { installNodeModuleTypesForSnippet } from "./installNodeModuleTypesForSnippet"

export class FilesystemTypesHandler {
  private projectRoot: string

  constructor(initialDir: string) {
    this.projectRoot = this.findProjectRoot(initialDir)
  }

  async handleInitialTypeDependencies(filePath: string) {
    console.log("Checking initial type dependencies...")
    try {
      if (!this.areTypesInstalled(filePath)) {
        console.log("Installing missing initial types...")
        await installNodeModuleTypesForSnippet(filePath)
      }
    } catch (error) {
      console.warn("Error handling initial type dependencies:", error)
    }
  }

  async handleFileTypeDependencies(filePath: string) {
    try {
      if (!this.areTypesInstalled(filePath)) {
        console.log("Installing missing file types...")
        await installNodeModuleTypesForSnippet(filePath)
      }
    } catch (error) {
      console.warn("Failed to verify types:", error)
    }
  }

  private areTypesInstalled(filePath: string): boolean {
    const imports = findImportsInSnippet(filePath)
    return imports.every((imp) => this.checkTypeExists(imp))
  }

  private checkTypeExists(importPath: string): boolean {
    if (!importPath.startsWith("@tsci/")) return true

    const pathWithoutPrefix = importPath.replace("@tsci/", "")
    const [owner, name] = pathWithoutPrefix.split(".")

    const typePath = path.join(
      this.projectRoot,
      "node_modules",
      "@tsci",
      `${owner}.${name}`,
      "index.d.ts",
    )

    return fs.existsSync(typePath)
  }

  private findProjectRoot(startDir: string): string {
    let root = path.resolve(startDir)
    while (root !== path.parse(root).root) {
      if (fs.existsSync(path.join(root, "package.json"))) {
        return root
      }
      root = path.dirname(root)
    }
    return startDir
  }
}
