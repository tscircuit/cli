import fs from "node:fs"
import path from "node:path"
import type { CircuitJsonIssue } from "./circuit-json-diagnostics"

export const BUILD_ERRORS_FILE_NAME = "errors.json"

/**
 * Writes every build error next to circuit.json so the full list is available
 * when the log only shows a summary. A build without errors removes the file,
 * so an errors.json from an earlier build is never mistaken for the current one.
 * Returns the path written, or null when there were no errors.
 */
export function writeBuildErrorsFile(
  circuitJsonOutputPath: string,
  errors: CircuitJsonIssue[],
): string | null {
  const errorsFilePath = path.join(
    path.dirname(circuitJsonOutputPath),
    BUILD_ERRORS_FILE_NAME,
  )
  if (errors.length === 0) {
    fs.rmSync(errorsFilePath, { force: true })
    return null
  }
  fs.writeFileSync(errorsFilePath, `${JSON.stringify(errors, null, 2)}\n`)
  return errorsFilePath
}
