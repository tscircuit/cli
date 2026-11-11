import { expect, test } from "bun:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import {
  getMatchingFilePaths,
  getVirtualFileSystemFromDirPath,
  getVirtualFilesystemModuleFromDirPath,
  writeVfsToDirectory,
} from "lib/shared/virtual-filesystem"
import { buildCliBundles } from "../../scripts/bun-build"

test("virtual-filesystem traverses nested files with POSIX paths, extensions, and fileMatchFn", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tsci-vfs-test-"))
  try {
    await fs.mkdir(path.join(tempDir, "src/components"), { recursive: true })
    await fs.mkdir(path.join(tempDir, "node_modules/pkg"), { recursive: true })
    await fs.writeFile(path.join(tempDir, "index.tsx"), "export default 1")
    await fs.writeFile(
      path.join(tempDir, "src/components/board.ts"),
      "export const board = true",
    )
    await fs.writeFile(path.join(tempDir, ".env"), "SECRET=1")
    await fs.writeFile(
      path.join(tempDir, "node_modules/pkg/index.js"),
      "module.exports = {}",
    )
    await fs.writeFile(
      path.join(tempDir, "node_modules/pkg/part.kicad_mod"),
      "(footprint R_0402)",
    )

    await expect(
      getMatchingFilePaths({
        dirPath: tempDir,
        extensions: ["ts"],
        fileMatchFn: () => true,
      }),
    ).rejects.toThrow("Cannot provide extensions and fileMatchFn")

    const tsAndTsxPaths = await getMatchingFilePaths({
      dirPath: tempDir,
      extensions: ["ts", "tsx"],
    })
    expect(tsAndTsxPaths).toEqual(["index.tsx", "src/components/board.ts"])

    const vfs = await getVirtualFileSystemFromDirPath({
      dirPath: tempDir,
      contentFormat: "string",
      fileMatchFn: (filePath) => {
        if (filePath.endsWith(".kicad_mod")) return true
        if (filePath.includes("node_modules/")) return false
        if (filePath.match(/^\.[^/]/)) return false
        return true
      },
    })

    expect(vfs).toEqual({
      "index.tsx": "export default 1",
      "node_modules/pkg/part.kicad_mod": "(footprint R_0402)",
      "src/components/board.ts": "export const board = true",
    })

    const bufferVfs = await getVirtualFileSystemFromDirPath({
      dirPath: tempDir,
      extensions: ["tsx"],
      contentFormat: "buffer",
    })
    expect(Buffer.isBuffer(bufferVfs["index.tsx"])).toBe(true)
    expect(bufferVfs["index.tsx"].toString()).toBe("export default 1")

    const pathListModule = await getVirtualFilesystemModuleFromDirPath({
      dirPath: tempDir,
      extensions: ["ts", "tsx"],
      contentFormat: "export-pathlist",
    })
    expect(pathListModule).toContain('"index.tsx"')
    expect(pathListModule).toContain('"src/components/board.ts"')

    const outDir = path.join(tempDir, "out")
    await writeVfsToDirectory({
      vfs: {
        "nested/hello.txt": "world",
      },
      outDir,
    })
    expect(
      await fs.readFile(path.join(outDir, "nested/hello.txt"), "utf8"),
    ).toBe("world")
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})

test("built CLI and library bundles exclude make-vfs, minimatch, and brace-expansion", async () => {
  const tempOutDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "tsci-cli-bundles-"),
  )
  try {
    await buildCliBundles({ outdir: tempOutDir, logOutputs: false })

    const bundlePaths = [
      "cli/main.js",
      "lib/index.js",
      "cli/build/build.worker.js",
      "cli/snapshot/snapshot.worker.js",
    ]

    for (const relBundlePath of bundlePaths) {
      const content = await fs.readFile(
        path.join(tempOutDir, relBundlePath),
        "utf8",
      )
      expect(content).not.toContain("make-vfs/dist/index.js")
      expect(content).not.toContain("minimatch/dist/")
      expect(content).not.toContain("brace-expansion/index.js")
    }
  } finally {
    await fs.rm(tempOutDir, { recursive: true, force: true })
  }
})
