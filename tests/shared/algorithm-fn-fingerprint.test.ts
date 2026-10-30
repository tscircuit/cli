import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { temporaryDirectory } from "tempy"
import { getAlgorithmFnFingerprint } from "lib/shared/algorithm-fn-fingerprint"
import { createLocalCacheEngine } from "lib/shared/get-platform-config-with-cli-defaults"

test("algorithmFn fingerprint changes only when the algorithm's code changes", async () => {
  const projectDir = temporaryDirectory()
  const write = (relativePath: string, content: string) => {
    fs.mkdirSync(path.dirname(path.join(projectDir, relativePath)), {
      recursive: true,
    })
    fs.writeFileSync(path.join(projectDir, relativePath), content)
  }
  let importCount = 0
  const importBoard = async () =>
    import(
      `${pathToFileURL(path.join(projectDir, "index.circuit.tsx")).href}?v=${importCount++}`
    )

  write("package.json", JSON.stringify({ name: "fixture" }))
  write("lib/route-helpers.ts", "export const gridSize = 1\n")
  write(
    "lib/my-router.ts",
    `import { gridSize } from "./route-helpers"
export class MyRouter { constructor(public srj: any) {} grid = gridSize }
`,
  )
  write("lib/unrelated.ts", "export const unrelated = 1\n")
  write(
    "lib/make-router.ts",
    "export const makeRouter = (effort: number) => async (srj: any) => ({ srj, effort })\n",
  )
  const writeBoard = (boardWidth: string, effort = 1) =>
    write(
      "index.circuit.tsx",
      `import { MyRouter } from "./lib/my-router"
import { makeRouter } from "./lib/make-router"
export const algorithmFn = async (srj: any) => new MyRouter(srj)
export const factoryAlgorithmFn = makeRouter(${effort})
export const boardWidth = "${boardWidth}"
`,
    )
  writeBoard("10mm")

  const fingerprint = async () => {
    const board = await importBoard()
    return {
      direct: getAlgorithmFnFingerprint(board.algorithmFn, projectDir),
      factory: getAlgorithmFnFingerprint(board.factoryAlgorithmFn, projectDir),
    }
  }

  const initial = await fingerprint()
  expect(initial.direct).toMatch(/^[a-f0-9]{16}-[a-f0-9]{16}$/)

  // Editing the board or unrelated files keeps the direct algorithm's cache.
  writeBoard("20mm")
  write("lib/unrelated.ts", "export const unrelated = 22\n")
  const afterBoardEdit = await fingerprint()
  expect(afterBoardEdit.direct).toBe(initial.direct)

  // The factory's captured `effort` can't be traced, so any project edit counts.
  expect(afterBoardEdit.factory).not.toBe(initial.factory)

  // Editing code the algorithm imports, even transitively, changes it.
  write("lib/route-helpers.ts", "export const gridSize = 22\n")
  const afterHelperEdit = await fingerprint()
  expect(afterHelperEdit.direct).not.toBe(initial.direct)
  expect(afterHelperEdit.direct!.split("-")[0]).toBe(
    initial.direct!.split("-")[0],
  )

  const board = await importBoard()
  expect(
    getAlgorithmFnFingerprint(board.algorithmFn.bind(null), projectDir),
  ).toBeNull()
})

test("filesystem cache clears results from earlier versions of an algorithm", () => {
  const projectDir = temporaryDirectory()
  const cacheDir = path.join(projectDir, ".tscircuit", "cache")
  fs.writeFileSync(path.join(projectDir, "package.json"), "{}")
  fs.writeFileSync(path.join(projectDir, "router.ts"), "export const v = 1\n")
  const cache = createLocalCacheEngine(cacheDir, { projectDir })

  // `capturedEffort` isn't declared in the project, so the fingerprint falls
  // back to hashing every project file.
  const capturedEffort = 1
  const algorithmFn = async (srj: any) => ({ srj, effort: capturedEffort })
  const fingerprint1 = cache.getAlgorithmFnFingerprint!(algorithmFn)!
  const key = (fingerprint: string) =>
    `routes:core@1:solver:abc:algorithm:${fingerprint}:srj:def`
  cache.setItem(key(fingerprint1), "cached-route")
  cache.setItem("unrelated-key", "kept")
  expect(cache.getItem(key(fingerprint1))).toBe("cached-route")
  expect(
    fs.readdirSync(cacheDir).filter((name) => name.startsWith("algorithm-")),
  ).toHaveLength(1)

  fs.writeFileSync(path.join(projectDir, "router.ts"), "export const v = 222\n")
  const fingerprint2 = cache.getAlgorithmFnFingerprint!(algorithmFn)!
  expect(fingerprint2).not.toBe(fingerprint1)
  expect(cache.getItem(key(fingerprint1))).toBeNull()
  expect(cache.getItem(key(fingerprint2))).toBeNull()
  expect(
    fs.readdirSync(cacheDir).filter((name) => name.startsWith("algorithm-")),
  ).toHaveLength(0)
  expect(cache.getItem("unrelated-key")).toBe("kept")
})
