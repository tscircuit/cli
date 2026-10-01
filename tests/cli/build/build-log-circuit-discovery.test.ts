import { afterEach, expect, test } from "bun:test"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { getBuildEntrypoints } from "../../../cli/build/get-build-entrypoints"

const projectDirs: string[] = []
afterEach(async () => {
  await Promise.all(
    projectDirs
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

const createProject = async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "tsci-log-discovery-"))
  projectDirs.push(rootDir)
  await writeFile(path.join(rootDir, "package.json"), "{}")
  await writeFile(path.join(rootDir, "index.tsx"), "export default () => null")
  await mkdir(path.join(rootDir, "logs", "routing"), { recursive: true })
  await writeFile(
    path.join(rootDir, "logs", "routing", "attempt.circuit.json"),
    "[]",
  )
  return rootDir
}

test("diagnostic circuit JSON does not replace index.tsx", async () => {
  const rootDir = await createProject()
  const result = await getBuildEntrypoints({ rootDir })
  expect(result.circuitFiles).toEqual([path.join(rootDir, "index.tsx")])
})

test("default discovery retains real JSON and TSX entrypoints", async () => {
  const rootDir = await createProject()
  await writeFile(path.join(rootDir, "board.circuit.json"), "[]")
  await writeFile(
    path.join(rootDir, "logs", "intentional.circuit.tsx"),
    "export default () => null",
  )
  const result = await getBuildEntrypoints({ rootDir })
  expect(result.circuitFiles).toEqual([
    path.join(rootDir, "board.circuit.json"),
    path.join(rootDir, "logs", "intentional.circuit.tsx"),
  ])
})

test("an explicit diagnostic JSON path can still be built", async () => {
  const rootDir = await createProject()
  const fileOrDir = "logs/routing/attempt.circuit.json"
  const result = await getBuildEntrypoints({ rootDir, fileOrDir })
  expect(result.circuitFiles).toEqual([path.join(rootDir, fileOrDir)])
})

test("configured includeBoardFiles can opt in to diagnostic JSON", async () => {
  const rootDir = await createProject()
  await writeFile(
    path.join(rootDir, "tscircuit.config.json"),
    JSON.stringify({ includeBoardFiles: ["logs/**/*.circuit.json"] }),
  )
  const result = await getBuildEntrypoints({ rootDir })
  expect(result.circuitFiles).toEqual([
    path.join(rootDir, "logs/routing/attempt.circuit.json"),
  ])
})
