import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { gunzipSync } from "node:zlib"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import { getOrGenerateCircuitJson } from "lib/shared/get-or-generate-circuit-json"
import { importFromUserLand } from "lib/shared/importFromUserLand"
import ts from "typescript"

export const loadAnalogInput = async (
  file: string,
  projectDir: string,
  platformConfig: PlatformConfig,
) => {
  let circuitJson: AnyCircuitElement[] | undefined
  let pipelineJsonEntry = false
  if (file.endsWith(".json")) {
    const json = JSON.parse(await readFile(resolve(file), "utf8"))
    if (Array.isArray(json)) circuitJson = json
    else if (json && typeof json.circuit === "string") {
      pipelineJsonEntry = true
      const circuitPath = resolve(dirname(resolve(file)), json.circuit)
      const bytes = await readFile(circuitPath)
      circuitJson = JSON.parse(
        circuitPath.endsWith(".gz")
          ? gunzipSync(bytes).toString()
          : bytes.toString(),
      )
    }
    if (!Array.isArray(circuitJson)) {
      throw new Error(
        "Expected Circuit JSON or a pipeline JSON entry with a circuit path",
      )
    }
  } else {
    // Ordinary TSX keeps the existing builder/cache and static-asset loaders.
    // Only explicit record exports need direct evaluation before dispatch.
    const source = ts.createSourceFile(
      file,
      await readFile(resolve(file), "utf8"),
      ts.ScriptTarget.Latest,
    )
    const exportsRecords = source.statements.some((statement) =>
      ts.isExportDeclaration(statement)
        ? !statement.exportClause ||
          (ts.isNamedExports(statement.exportClause) &&
            statement.exportClause.elements.some(
              (entry) => entry.name.text === "circuitJson",
            ))
        : ts.isVariableStatement(statement) &&
          statement.modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
          ) &&
          statement.declarationList.declarations.some(
            (entry) =>
              ts.isIdentifier(entry.name) && entry.name.text === "circuitJson",
          ),
    )
    if (exportsRecords) {
      ;(globalThis as any).React = await importFromUserLand("react", projectDir)
      const entry = await import(pathToFileURL(resolve(file)).href)
      if (Array.isArray(entry.circuitJson)) circuitJson = entry.circuitJson
    }
    if (!circuitJson) {
      ;({ circuitJson } = await getOrGenerateCircuitJson({
        filePath: file,
        projectDir,
        saveToFile: false,
        platformConfig,
      }))
    }
  }
  return { circuitJson, pipelineJsonEntry }
}
