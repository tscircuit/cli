import { expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import {
  getMatchingFilePaths,
  getVirtualFileSystemFromDirPath,
  writeVfsToDirectory,
} from "lib/utils/make-vfs"

test("make-vfs utility collects POSIX paths, filters files, and writes VFS", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "tsci-make-vfs-"))
  try {
    await mkdir(path.join(root, "sub", "nested"), { recursive: true })
    await mkdir(path.join(root, ".hidden"), { recursive: true })
    await writeFile(path.join(root, "index.tsx"), "export default () => null")
    await writeFile(path.join(root, "sub", "helper.ts"), "export const x = 1")
    await writeFile(
      path.join(root, "sub", "nested", "notes.txt"),
      "hello world",
    )
    await writeFile(path.join(root, ".hidden", "secret.ts"), "export {}")

    await expect(
      getMatchingFilePaths({
        dirPath: root,
        extensions: ["ts"],
        fileMatchFn: () => true,
      }),
    ).rejects.toThrow("Cannot provide extensions and fileMatchFn")

    const tsPaths = await getMatchingFilePaths({
      dirPath: root,
      extensions: ["ts", "tsx"],
    })
    expect(tsPaths).toEqual([".hidden/secret.ts", "index.tsx", "sub/helper.ts"])

    const vfs = await getVirtualFileSystemFromDirPath({
      dirPath: root,
      contentFormat: "string",
      fileMatchFn: (filename) =>
        !filename.startsWith(".") && !filename.endsWith(".txt"),
    })
    expect(vfs).toEqual({
      "index.tsx": "export default () => null",
      "sub/helper.ts": "export const x = 1",
    })

    const outDir = path.join(root, "out")
    await writeVfsToDirectory({
      vfs: vfs as Record<string, string>,
      outDir,
    })
    expect(await readFile(path.join(outDir, "sub", "helper.ts"), "utf8")).toBe(
      "export const x = 1",
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("CLI bundle outputs do not inline make-vfs, brace-expansion, or minimatch", async () => {
  const proc = Bun.spawn([process.execPath, "run", "scripts/bun-build.ts"], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
  })
  const [exitCode, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stderr).text(),
  ])
  expect(exitCode, stderr).toBe(0)

  const bundlePaths = [
    "dist/cli/main.js",
    "dist/lib/index.js",
    "dist/cli/build/build.worker.js",
    "dist/cli/snapshot/snapshot.worker.js",
  ]

  for (const relBundlePath of bundlePaths) {
    const content = await readFile(
      path.resolve(process.cwd(), relBundlePath),
      "utf8",
    )
    expect(content).not.toContain("node_modules/make-vfs/dist/index.js")
    expect(content).not.toContain("brace-expansion")
    expect(content).not.toContain("minimatch")
  }
}, 60_000)
