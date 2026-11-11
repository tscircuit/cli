import type { Dirent } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"

export type VirtualFilePath = string
export type VirtualFileContent = Buffer | ArrayBuffer | string
export type VirtualFileContentFormat =
  | "buffer"
  | "string"
  | "arraybuffer"
  | "import-star"
  | "import-default"
  | "require"
  | "export-pathlist"
  | "import-bunfile"

export interface VirtualFileSearchOptions {
  dirPath: string
  targetPath?: string
  extensions?: string[]
  fileMatchFn?: (filename: string, fullPath: string) => boolean
  contentFormat?: VirtualFileContentFormat
  noImportExt?: boolean
}

export interface WriteVfsOptions {
  vfs: Record<VirtualFilePath, string | Uint8Array>
  vfsDir?: string
  outDir: string
}

const CHARS_SAFE_TO_LEAVE_ENCODED = "{}.,<>?/:'[]!@#$^&*() -_=+".split("")

const replaceSafeEncodedChars = (input: string) => {
  let output = input
  for (const char of CHARS_SAFE_TO_LEAVE_ENCODED) {
    const encoded = encodeURIComponent(char)
    if (char === encoded) continue
    output = output.replace(new RegExp(encoded, "g"), char)
  }
  return output
}

const idsafe = (value: string) => `_${value.replace(/[^a-zA-Z0-9]/g, "_")}`

const toPosixPath = (pathStr: string) => {
  if (!pathStr) return pathStr
  return pathStr
    .replace(/^[A-Za-z]:/, "")
    .split(path.sep)
    .join("/")
}

const collectRelativeFiles = async (
  currentDir: string,
  relativePrefix: string,
  visitedDirs: Set<string>,
  results: string[],
) => {
  let entries: Dirent[]
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true })
  } catch (error: any) {
    if (
      error?.code === "ENOENT" ||
      error?.code === "ENOTDIR" ||
      error?.code === "EACCES" ||
      error?.code === "EPERM"
    ) {
      return
    }
    throw error
  }
  entries.sort((a, b) => a.name.localeCompare(b.name))

  for (const entry of entries) {
    const fullEntryPath = path.join(currentDir, entry.name)
    const relPosixPath = relativePrefix
      ? `${relativePrefix}/${entry.name}`
      : entry.name

    if (entry.isDirectory()) {
      const realDir = await fs
        .realpath(fullEntryPath)
        .catch(() => path.resolve(fullEntryPath))
      if (visitedDirs.has(realDir)) continue
      visitedDirs.add(realDir)
      await collectRelativeFiles(
        fullEntryPath,
        relPosixPath,
        visitedDirs,
        results,
      )
    } else if (entry.isFile()) {
      results.push(relPosixPath)
    } else if (entry.isSymbolicLink()) {
      const stat = await fs.stat(fullEntryPath).catch(() => null)
      if (!stat) continue
      if (stat.isFile()) {
        results.push(relPosixPath)
      } else if (stat.isDirectory()) {
        const realDir = await fs
          .realpath(fullEntryPath)
          .catch(() => path.resolve(fullEntryPath))
        if (visitedDirs.has(realDir)) continue
        visitedDirs.add(realDir)
        await collectRelativeFiles(
          fullEntryPath,
          relPosixPath,
          visitedDirs,
          results,
        )
      }
    }
  }
}

export const getMatchingFilePaths = async ({
  dirPath,
  extensions,
  fileMatchFn,
}: VirtualFileSearchOptions): Promise<string[]> => {
  if (extensions && fileMatchFn) {
    throw new Error("Cannot provide extensions and fileMatchFn")
  }

  const normalizedExtensions = extensions?.map((ext) =>
    ext.startsWith(".") ? ext : `.${ext}`,
  )
  const matcher =
    fileMatchFn ??
    (normalizedExtensions
      ? (filename: string) =>
          normalizedExtensions.some((ext) => filename.endsWith(ext))
      : () => true)

  const visitedDirs = new Set<string>([
    await fs.realpath(dirPath).catch(() => path.resolve(dirPath)),
  ])
  const allRelativeFiles: string[] = []
  await collectRelativeFiles(dirPath, "", visitedDirs, allRelativeFiles)

  return allRelativeFiles.filter((filename) =>
    matcher(filename, path.resolve(dirPath, filename)),
  )
}

export const getVirtualFileSystemFromDirPath = async (
  opts: VirtualFileSearchOptions,
): Promise<Record<VirtualFilePath, VirtualFileContent>> => {
  const { dirPath, contentFormat = "string" } = opts
  const filePaths = await getMatchingFilePaths(opts)
  const vfs: Record<VirtualFilePath, VirtualFileContent> = {}

  for (const filePath of filePaths) {
    const fullPath = path.resolve(dirPath, filePath)
    let content: Buffer
    try {
      content = await fs.readFile(fullPath)
    } catch (error: any) {
      if (error?.code === "ENOENT") continue
      throw error
    }
    const normalizedPath = toPosixPath(filePath)
    if (contentFormat === "buffer") {
      vfs[normalizedPath] = content
    } else if (contentFormat === "arraybuffer") {
      vfs[normalizedPath] = content.buffer.slice(
        content.byteOffset,
        content.byteOffset + content.byteLength,
      )
    } else {
      vfs[normalizedPath] = content.toString("utf8")
    }
  }

  return vfs
}

export const getVirtualFilesystemModuleFromDirPath = async (
  opts: VirtualFileSearchOptions,
): Promise<string> => {
  const cf = opts.contentFormat ?? "buffer"
  if (cf === "arraybuffer") {
    throw new Error("arraybuffer not yet implemented, contributions welcome")
  }

  const vfs = await getVirtualFileSystemFromDirPath({
    ...opts,
    contentFormat: cf === "buffer" ? "buffer" : "string",
  })

  switch (cf) {
    case "buffer":
    case "string": {
      return `export default {\n${Object.entries(vfs)
        .map(([filePath, content]) => {
          const buf = Buffer.isBuffer(content)
            ? content
            : Buffer.from(String(content), "utf8")
          return cf === "buffer"
            ? `  "${toPosixPath(filePath)}": Buffer.from("${buf.toString("base64")}", "base64")`
            : `  "${toPosixPath(filePath)}": decodeURIComponent("${replaceSafeEncodedChars(
                encodeURIComponent(buf.toString("utf8")),
              )}")`
        })
        .join(",\n")}\n}`
    }
    case "require":
    case "import-default":
    case "import-star": {
      if (!opts.targetPath) {
        throw new Error(
          "targetPath is required when using content-format of require,import-default,import-star",
        )
      }
      const basePath = path.relative(
        path.dirname(opts.targetPath),
        opts.dirPath,
      )
      let fps = Object.keys(vfs)
      if (opts.noImportExt) {
        fps = fps.map((fp) => fp.replace(/\.[^.]+$/, ""))
      }
      return `${fps
        .map((fp) => {
          const relImport = toPosixPath(path.join(basePath, fp))
          return cf === "require"
            ? `const ${idsafe(fp)} = require("./${relImport}")`
            : cf === "import-default"
              ? `import ${idsafe(fp)} from "./${relImport}"`
              : `import * as ${idsafe(fp)} from "./${relImport}"`
        })
        .join(
          "\n",
        )}\n\nexport default {\n${fps.map((fp) => `  "${fp}": ${idsafe(fp)}`).join(",\n")}\n}`
    }
    case "export-pathlist": {
      return `export default [\n${Object.keys(vfs)
        .map((filePath) => `  "${filePath}"`)
        .join(",\n")}\n]`
    }
    case "import-bunfile": {
      if (!opts.targetPath) {
        throw new Error(
          "targetPath is required when using content-format of require,import-default,import-star",
        )
      }
      const basePath = path.relative(
        path.dirname(opts.targetPath),
        opts.dirPath,
      )
      const fps = Object.keys(vfs)
      return `${fps
        .map(
          (fp) =>
            `import ${idsafe(fp)} from "./${toPosixPath(path.join(basePath, fp))}" with { type: "file" };`,
        )
        .join(
          "\n",
        )}\n\nimport { file } from "bun";\n\nexport default {\n${fps.map((fp) => `  "${fp}": file(${idsafe(fp)})`).join(",\n")}\n}`
    }
  }
  throw new Error(`Unknown content format: ${cf}`)
}

export const writeVfsToDirectory = async (opts: WriteVfsOptions) => {
  const { vfs, vfsDir, outDir } = opts
  for (const [filePath, content] of Object.entries(vfs)) {
    if (vfsDir && !filePath.startsWith(vfsDir)) {
      continue
    }
    const relativePath = vfsDir ? path.relative(vfsDir, filePath) : filePath
    const outputPath = path.join(outDir, relativePath)
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, content)
  }
}
