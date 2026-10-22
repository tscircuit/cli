import { expect, test } from "bun:test"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { loadAnalogInput } from "cli/simulate/load-analog-input"
import {
  addSourceFilesystemHash,
  getCircuitJsonBuildOutputPath,
  getSourceFilesystemMd5Hash,
} from "lib/shared/circuit-json-build-cache"
import { temporaryDirectory } from "tempy"

test("analog reuses a current build without evaluating the source", async () => {
  const projectDir = temporaryDirectory()
  globalThis.deferredCleanupFns.push(() =>
    rm(projectDir, { recursive: true, force: true }),
  )
  await writeFile(join(projectDir, "package.json"), "{}")
  const file = join(projectDir, "entry.tsx")
  await writeFile(
    file,
    'throw new Error("Cached source must not be evaluated")',
  )
  const circuitJson = addSourceFilesystemHash(
    [],
    getSourceFilesystemMd5Hash(file),
  )
  const outputPath = getCircuitJsonBuildOutputPath(file)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, JSON.stringify(circuitJson))

  const input = await loadAnalogInput({ file, projectDir, platformConfig: {} })
  expect(input.circuitJson).toEqual(circuitJson)
  expect(input.isPipelineJsonEntry).toBe(false)
})
