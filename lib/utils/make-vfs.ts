import fs from "node:fs/promises"
import path from "node:path"

export type ContentFormat =
  | "buffer"
  | "string"
  | "arraybuffer"
  | "import-star"
  | "import-default"
  | "require"
  | "export-pathlist"
  | "import-bunfile"

export interface SearchOpts {
  dirPath: string
  targetPath?: string
  extensions?: string[]
  fileMatchFn?: (filename: string, fullPath: string) => boolean
  contentFormat?: ContentFormat
  noImportExt?: boolean
}

const charsSafeToLeaveEncoded = "{}.,<>?/:'[]!@#$^&*() -_=+".split("")

const replaceSafeEncodedChars = (input: string) => {
  let result = input
  for (const char of charsSafeToLeaveEncoded) {
    if (char === encodeURIComponent(char)) continue
    result = result.replaceAll(encodeURIComponent(char), char)
  }
  return result
}

const idsafe = (value: string) => `_${value.replace(/[^a-zA-Z0-9]/g, "_")}`

const toPosixPath = (pathStr: string) => {
  if (!pathStr) return pathStr
  return pathStr
    .replace(/^[A-Za-z]:/, "")
    .split(path.sep)
    .join("/")
}

async function collectFilesRecursively(
  rootDir: string,
  currentDir: string,
  visitedDirs: Set<string>,
  results: string[],
): Promise<void> {
  let realCurrentDir: string
  try {
    realCurrentDir = await fs.realpath(currentDir)
  } catch {
    return
  }
  if (visitedDirs.has(realCurrentDir)) return
  visitedDirs.add(realCurrentDir)

  const entries = await fs.readdir(currentDir, { withFileTypes: true })
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))

  for (const entry of entries) {
    const fullEntryPath = path.join(currentDir, entry.name)
    if (entry.isDirectory()) {
      await collectFilesRecursively(
        rootDir,
        fullEntryPath,
        visitedDirs,
        results,
      )
    } else if (entry.isFile()) {
      const relPath = toPosixPath(path.relative(rootDir, fullEntryPath))
      results.push(relPath)
    } else if (entry.isSymbolicLink()) {
      try {
        const stat = await fs.stat(fullEntryPath)
        if (stat.isDirectory()) {
          await collectFilesRecursively(
            rootDir,
            fullEntryPath,
            visitedDirs,
            results,
          )
        } else if (stat.isFile()) {
          const relPath = toPosixPath(path.relative(rootDir, fullEntryPath))
          results.push(relPath)
        }
      } catch {
        // Ignore broken symlinks, matching glob's nodir behavior
      }
    }
  }
}

export const getMatchingFilePaths = async ({
  dirPath,
  extensions,
  fileMatchFn,
}: SearchOpts): Promise<string[]> => {
  if (extensions && fileMatchFn) {
    throw new Error("Cannot provide extensions and fileMatchFn")
  }
  let resolvedMatchFn = fileMatchFn
  if (extensions) {
    resolvedMatchFn = (filename) =>
      extensions.some((ext) => filename.endsWith(`.${ext}`))
  }
  if (!resolvedMatchFn) {
    resolvedMatchFn = () => true
  }

  const resolvedRoot = path.resolve(dirPath)
  const files: string[] = []
  await collectFilesRecursively(resolvedRoot, resolvedRoot, new Set(), files)

  return files.filter((filename) =>
    resolvedMatchFn!(filename, path.join(dirPath, filename)),
  )
}

export const getVirtualFileSystemFromDirPath = async (
  opts: SearchOpts,
): Promise<Record<string, Buffer | ArrayBuffer | string>> => {
  const { dirPath, contentFormat = "string" } = opts
  const filePaths = await getMatchingFilePaths(opts)
  const vfs: Record<string, Buffer | ArrayBuffer | string> = {}

  for (const filePath of filePaths) {
    const fullPath = path.join(dirPath, filePath)
    const content = await fs.readFile(fullPath)
    const normalizedPath = toPosixPath(filePath)
    vfs[normalizedPath] =
      contentFormat === "buffer" ? content : content.toString()
  }

  return vfs
}

export const getVirtualFilesystemModuleFromDirPath = async (
  opts: SearchOpts,
): Promise<string> => {
  const cf = opts.contentFormat ?? "buffer"
  const vfs = await getVirtualFileSystemFromDirPath({
    ...opts,
    contentFormat: cf === "buffer" ? "buffer" : "string",
  })

  switch (cf) {
    case "buffer":
    case "string": {
      return (
        `export default {\n` +
        Object.entries(vfs)
          .map(([filePath, content]) =>
            cf === "buffer"
              ? `  "${toPosixPath(filePath)}": Buffer.from("${Buffer.from(
                  content as Buffer,
                ).toString("base64")}", "base64")`
              : `  "${toPosixPath(filePath)}": decodeURIComponent("${replaceSafeEncodedChars(
                  encodeURIComponent(String(content)),
                )}")`,
          )
          .join(",\n") +
        `\n}`
      )
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
      return (
        `${fps
          .map((fp) =>
            cf === "require"
              ? `const ${idsafe(fp)} = require("./${path.join(basePath, fp)}")`
              : cf === "import-default"
                ? `import ${idsafe(fp)} from "./${path.join(basePath, fp)}"`
                : `import * as ${idsafe(fp)} from "./${path.join(basePath, fp)}"`,
          )
          .join("\n")}\n\n` +
        `export default {\n` +
        fps.map((fp) => `  "${fp}": ${idsafe(fp)}`).join(",\n") +
        `\n}`
      )
    }
    case "arraybuffer": {
      throw new Error("arraybuffer not yet implemented, contributions welcome")
    }
    case "export-pathlist": {
      return (
        `export default [\n` +
        Object.keys(vfs)
          .map((fp) => `  "${fp}"`)
          .join(",\n") +
        `\n]`
      )
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
      return (
        `${fps
          .map(
            (fp) =>
              `import ${idsafe(fp)} from "./${path.join(basePath, fp)}" with { type: "file" };`,
          )
          .join("\n")}\n\n` +
        'import { file } from "bun";\n\n' +
        `export default {\n` +
        fps.map((fp) => `  "${fp}": file(${idsafe(fp)})`).join(",\n") +
        `\n}`
      )
    }
  }
  throw new Error(`Unknown content format: ${cf}`)
}

export const writeVfsToDirectory = async (opts: {
  vfs: Record<string, Buffer | string>
  vfsDir?: string
  outDir: string
}): Promise<void> => {
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
