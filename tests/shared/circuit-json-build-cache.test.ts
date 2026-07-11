import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { temporaryDirectory } from "tempy"
import {
  getCircuitJsonBuildOutputPath,
  getSourceFilesystemMd5Hash,
} from "lib/shared/circuit-json-build-cache"

test("source filesystem hash tracks source files and ignores build artifacts", () => {
  const projectDir = temporaryDirectory()
  const circuitPath = path.join(projectDir, "boards", "main.circuit.tsx")
  fs.mkdirSync(path.dirname(circuitPath), { recursive: true })
  fs.writeFileSync(path.join(projectDir, "package.json"), '{"name":"board"}')
  fs.writeFileSync(circuitPath, "export default () => <board />")

  const initialHash = getSourceFilesystemMd5Hash(circuitPath)

  fs.mkdirSync(path.join(projectDir, "dist", "boards", "main"), {
    recursive: true,
  })
  fs.writeFileSync(
    path.join(projectDir, "dist", "boards", "main", "circuit.json"),
    "[]",
  )
  fs.writeFileSync(path.join(projectDir, "boards", "main.circuit.json"), "[]")

  expect(getSourceFilesystemMd5Hash(circuitPath)).toBe(initialHash)
  expect(getCircuitJsonBuildOutputPath(circuitPath)).toBe(
    path.join(projectDir, "dist", "boards", "main", "circuit.json"),
  )

  fs.writeFileSync(circuitPath, "export default () => <board width={10} />")
  expect(getSourceFilesystemMd5Hash(circuitPath)).not.toBe(initialHash)
})
