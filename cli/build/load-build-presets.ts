import fs from "node:fs"
import { pathToFileURL } from "node:url"
import ts from "typescript"
import type { PlatformConfig } from "@tscircuit/props"
import { importFromUserLand } from "lib/shared/importFromUserLand"
import { registerStaticAssetLoaders } from "lib/shared/register-static-asset-loaders"

export type BuildPreset = {
  name: string
  props: Record<string, unknown>
}

const isPropsObject = (props: unknown): props is Record<string, unknown> =>
  typeof props === "object" && props !== null && !Array.isArray(props)

const hasParser = (
  schema: unknown,
): schema is { parse: (input: unknown) => unknown } =>
  isPropsObject(schema) && typeof schema.parse === "function"

const exportsPresets = (filePath: string) => {
  if (!/\.[jt]sx?$/.test(filePath)) return false
  const sourceFile = ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TSX,
  )
  return sourceFile.statements.some((statement) => {
    if (ts.isVariableStatement(statement))
      return (
        statement.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
        ) &&
        statement.declarationList.declarations.some(
          (declaration) =>
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === "presets",
        )
      )
    return (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause) &&
      statement.exportClause.elements.some(
        (element) => element.name.text === "presets",
      )
    )
  })
}

export async function loadBuildPresets({
  filePath,
  projectDir,
  platformConfig,
}: {
  filePath: string
  projectDir: string
  platformConfig?: PlatformConfig
}): Promise<BuildPreset[]> {
  // Ordinary entrypoints keep their existing loading behavior.
  if (!exportsPresets(filePath)) return []
  const React = await importFromUserLand("react", projectDir)
  Object.assign(globalThis, { React })
  await registerStaticAssetLoaders(platformConfig, projectDir)
  const component = await import(pathToFileURL(filePath).href)
  if (
    !isPropsObject(component.presets) ||
    Object.keys(component.presets).length === 0
  )
    throw new Error(`${filePath}: presets must be a non-empty object`)
  if (component.propsSchema !== undefined && !hasParser(component.propsSchema))
    throw new Error(`${filePath}: propsSchema must have a parse method`)

  return Object.entries(component.presets).map(([name, props]) => {
    if (!/^[a-z][a-z0-9_]*$/.test(name))
      throw new Error(`${filePath}: preset "${name}" must use snake_case`)
    if (!isPropsObject(props))
      throw new Error(
        `${filePath}: preset "${name}" must contain a props object`,
      )
    let parsedProps: unknown
    try {
      parsedProps = component.propsSchema
        ? component.propsSchema.parse(props)
        : props
    } catch (error) {
      throw new Error(
        `${filePath}: invalid preset "${name}": ${error instanceof Error ? error.message : String(error)}`,
      )
    }
    if (!isPropsObject(parsedProps))
      throw new Error(
        `${filePath}: preset "${name}" must parse to a props object`,
      )
    return { name, props: parsedProps }
  })
}
