import { afterEach, expect, spyOn, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { tmpdir } from "node:os"
import {
  copyJscdnFiles,
  getJscdnDir,
  getSiteJscdnDir,
} from "lib/shared/jscdn-directory"
import {
  preparedJscdnFiles,
  writePreparedJscdn,
} from "tests/fixtures/prepared-jscdn"

const originalDir = process.env.TSCIRCUIT_JSCDN_DIR
const originalStandalone = process.env.TSCIRCUIT_STANDALONE
const temporaryDirs: string[] = []
afterEach(async () => {
  if (originalDir === undefined) delete process.env.TSCIRCUIT_JSCDN_DIR
  else process.env.TSCIRCUIT_JSCDN_DIR = originalDir
  if (originalStandalone === undefined) delete process.env.TSCIRCUIT_STANDALONE
  else process.env.TSCIRCUIT_STANDALONE = originalStandalone
  await Promise.all(
    temporaryDirs
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

const makeDirectory = async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "prepared-jscdn-"))
  temporaryDirs.push(dir)
  return dir
}

test("site packages are copied when requested or configured by standalone", async () => {
  const directory = await makeDirectory()
  delete process.env.TSCIRCUIT_STANDALONE
  process.env.TSCIRCUIT_JSCDN_DIR = directory
  expect(getSiteJscdnDir()).toBeUndefined()
  expect(getSiteJscdnDir(true)).toBe(directory)
  process.env.TSCIRCUIT_STANDALONE = "0"
  expect(getSiteJscdnDir()).toBeUndefined()
  process.env.TSCIRCUIT_STANDALONE = "1"
  expect(getSiteJscdnDir()).toBe(directory)
  delete process.env.TSCIRCUIT_JSCDN_DIR
  expect(getSiteJscdnDir()).toBeUndefined()
  expect(() => getSiteJscdnDir(true)).toThrow("requires TSCIRCUIT_JSCDN_DIR")
})

test("invalid source directories fail clearly", async () => {
  const directory = await makeDirectory()
  process.env.TSCIRCUIT_JSCDN_DIR = path.join(directory, "missing")
  expect(() => getJscdnDir()).toThrow("does not exist or is not a directory")
  const file = path.join(directory, "file")
  await writeFile(file, "content")
  process.env.TSCIRCUIT_JSCDN_DIR = file
  expect(() => getJscdnDir()).toThrow("not a directory")
})

test("copy prepared packages and assets byte-for-byte without fetching or rewriting", async () => {
  const directory = await makeDirectory()
  const source = path.join(directory, "source")
  const destination = path.join(directory, "dist/jscdn")
  await writePreparedJscdn(source)
  const unexpectedFetch = Object.assign(
    (_input: string | URL | Request): never => {
      throw new Error("Unexpected fetch")
    },
    { preconnect: globalThis.fetch.preconnect },
  )
  const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
    unexpectedFetch,
  )
  try {
    await copyJscdnFiles(source, destination)
    for (const [file, content] of Object.entries(preparedJscdnFiles)) {
      const copied = new Uint8Array(
        await readFile(path.join(destination, file)),
      )
      expect(copied).toEqual(
        typeof content === "string"
          ? new TextEncoder().encode(content)
          : content,
      )
    }
    expect(fetchSpy).not.toHaveBeenCalled()
  } finally {
    fetchSpy.mockRestore()
  }
})

test("copying an existing output onto itself is harmless and overlapping trees are rejected", async () => {
  const source = await makeDirectory()
  await writePreparedJscdn(source)
  await copyJscdnFiles(source, source)
  await expect(
    copyJscdnFiles(source, path.join(source, "dist/jscdn")),
  ).rejects.toThrow("must not contain each other")
  await expect(
    copyJscdnFiles(path.join(source, "_modules"), source),
  ).rejects.toThrow("must not contain each other")
})
