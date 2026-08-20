import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { getBuildEntrypoints } from "cli/build/get-build-entrypoints"
import { temporaryDirectory } from "tempy"

test("default build discovers work circuits alongside the main entrypoint", async () => {
  const projectDir = temporaryDirectory()
  fs.mkdirSync(path.join(projectDir, "work"), { recursive: true })
  fs.writeFileSync(path.join(projectDir, "package.json"), "{}")
  fs.writeFileSync(
    path.join(projectDir, "index.circuit.tsx"),
    "export default () => <board />",
  )
  fs.writeFileSync(
    path.join(projectDir, "work", "diagnostic.circuit.tsx"),
    "export default () => <board />",
  )

  const result = await getBuildEntrypoints({ rootDir: projectDir })
  const relativeCircuitFiles = result.circuitFiles.map((filePath) =>
    path.relative(projectDir, filePath).split(path.sep).join("/"),
  )

  expect(result.mainEntrypoint).toBeUndefined()
  expect(relativeCircuitFiles).toEqual([
    "index.circuit.tsx",
    "work/diagnostic.circuit.tsx",
  ])
})
