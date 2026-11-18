import { expect, test } from "bun:test"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import {
  getMatchingFilePaths,
  getVirtualFileSystemFromDirPath,
  getVirtualFilesystemModuleFromDirPath,
  writeVfsToDirectory,
} from "lib/shared/make-vfs"
import { buildCli } from "../../scripts/bun-build"

test("internal make-vfs helper traverses files cleanly and writes vfs directories", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "make-vfs-shim-"))
  try {
    const srcDir = path.join(workDir, "src")
    const nestedDir = path.join(srcDir, "nested")
    const outDir = path.join(workDir, "out")
    await mkdir(nestedDir, { recursive: true })
    await writeFile(path.join(srcDir, "index.tsx"), "export default () => null")
    await writeFile(path.join(nestedDir, "helper.ts"), "export const x = 1")
    await writeFile(path.join(srcDir, ".hidden"), "secret")

    const tsPaths = await getMatchingFilePaths({
      dirPath: srcDir,
      extensions: ["ts", "tsx"],
    })
    expect(tsPaths).toEqual(["index.tsx", "nested/helper.ts"])

    const filtered = await getMatchingFilePaths({
      dirPath: srcDir,
      fileMatchFn: (rel) => !rel.startsWith("."),
    })
    expect(filtered).toEqual(["index.tsx", "nested/helper.ts"])

    const stringVfs = await getVirtualFileSystemFromDirPath({
      dirPath: srcDir,
      extensions: ["ts"],
      contentFormat: "string",
    })
    expect(stringVfs).toEqual({
      "nested/helper.ts": "export const x = 1",
    })

    const bufferVfs = await getVirtualFileSystemFromDirPath({
      dirPath: srcDir,
      extensions: ["ts"],
      contentFormat: "buffer",
    })
    expect(Buffer.isBuffer(bufferVfs["nested/helper.ts"])).toBe(true)

    const modCode = await getVirtualFilesystemModuleFromDirPath({
      dirPath: srcDir,
      extensions: ["ts"],
      contentFormat: "string",
    })
    expect(modCode).toContain('"nested/helper.ts"')

    await writeVfsToDirectory({
      vfs: stringVfs as Record<string, string>,
      vfsDir: "nested",
      outDir,
    })
    const copied = await readFile(path.join(outDir, "helper.ts"), "utf-8")
    expect(copied).toBe("export const x = 1")
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
})

test("bun build bundles zero copies of external make-vfs / minimatch / brace-expansion", async () => {
  const outDir = await mkdtemp(path.join(tmpdir(), "cli-hygiene-dist-"))
  try {
    await buildCli({ outdir: outDir, copyPythonAssets: false, silent: true })

    for (const relBundle of [
      "cli/main.js",
      "lib/index.js",
      "cli/build/build.worker.js",
      "cli/snapshot/snapshot.worker.js",
    ]) {
      const bundleText = await readFile(path.join(outDir, relBundle), "utf-8")
      expect(bundleText).not.toContain("node_modules/make-vfs")
      expect(bundleText).not.toContain("glob-promise")
      expect(bundleText).not.toContain("brace-expansion")
      expect(bundleText).not.toContain("minimatch")
      expect(bundleText).not.toContain("EXPANSION_MAX_DEPTH")
    }
  } finally {
    await rm(outDir, { recursive: true, force: true })
  }
}, 45_000)
