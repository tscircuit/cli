import fs from "node:fs/promises"
import path from "node:path"

type Path = string
type Content = Buffer | ArrayBuffer | string
type ContentFormat =
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
const replaceSafeEncodedChars = (s: string) => {
  for (const char of charsSafeToLeaveEncoded) {
    if (char === encodeURIComponent(char)) continue
    s = s.replace(new RegExp(encodeURIComponent(char), "g"), char)
  }
  return s
}

function idsafe(s: string) {
  return `_${s.replace(/[^a-zA-Z0-9]/g, "_")}`
}

const toPosixPath = (pathStr: string) => {
  if (!pathStr) return pathStr
  return pathStr
    .replace(/^[A-Za-z]:/, "")
    .split(path.sep)
    .join("/")
}

async function collectFilesRecursively(
  baseDir: string,
  relPrefix: string,
  out: string[],
): Promise<void> {
  const entries = await fs.readdir(
    relPrefix ? path.join(baseDir, relPrefix) : baseDir,
    { withFileTypes: true },
  )
  entries.sort((a, b) => a.name.localeCompare(b.name))
  for (const entry of entries) {
    const relPosix = relPrefix ? `${relPrefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      await collectFilesRecursively(baseDir, relPosix, out)
    } else if (entry.isSymbolicLink()) {
      const stat = await fs.stat(path.join(baseDir, relPosix))
      if (stat.isDirectory()) {
        await collectFilesRecursively(baseDir, relPosix, out)
      } else {
        out.push(relPosix)
      }
    } else if (entry.isFile()) {
      out.push(relPosix)
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
  let matcher = fileMatchFn
  if (extensions) {
    matcher = (filename) =>
      extensions.some((ext) => filename.endsWith(`.${ext}`))
  }
  if (!matcher) {
    matcher = () => true
  }

  const resolvedRoot = path.resolve(dirPath)
  const files: string[] = []
  await collectFilesRecursively(resolvedRoot, "", files)
  return files
    .map((f) => toPosixPath(f))
    .filter((filename) => matcher!(filename, path.join(dirPath, filename)))
}

export const getVirtualFileSystemFromDirPath = async (
  opts: SearchOpts,
): Promise<Record<Path, Content>> => {
  const { dirPath, contentFormat = "string" } = opts
  const filePaths = await getMatchingFilePaths(opts)
  const vfs: Record<Path, Content> = {}

  for (const filePath of filePaths) {
    const fullPath = path.join(dirPath, filePath)
    const content = await fs.readFile(fullPath)
    const normalizedPath = toPosixPath(filePath)
    vfs[normalizedPath] =
      contentFormat === "string" ? content.toString("utf8") : content
  }

  return vfs
}

export const getVirtualFilesystemModuleFromDirPath = async (
  opts: SearchOpts,
): Promise<string> => {
  const vfs = await getVirtualFileSystemFromDirPath(opts)
  const cf = opts.contentFormat

  switch (cf ?? "buffer") {
    case "buffer":
    case "string": {
      return (
        "export default {\n" +
        Object.entries(vfs)
          .map(([filePath, content]) =>
            cf === "buffer"
              ? `  "${toPosixPath(filePath)}": Buffer.from("${Buffer.from(content as any).toString("base64")}", "base64")`
              : `  "${toPosixPath(filePath)}": decodeURIComponent("${replaceSafeEncodedChars(
                  encodeURIComponent(content.toString()),
                )}")`,
          )
          .join(",\n") +
        "\n}"
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
      const basePath = toPosixPath(
        path.relative(path.dirname(opts.targetPath), opts.dirPath),
      )
      let fps = Object.keys(vfs)
      if (opts.noImportExt) {
        fps = fps.map((fp) => fp.replace(/\.[^.]+$/, ""))
      }
      return (
        `${fps
          .map((fp) => {
            const relImport = basePath ? `${basePath}/${fp}` : fp
            return cf === "require"
              ? `const ${idsafe(fp)} = require("./${relImport}")`
              : cf === "import-default"
                ? `import ${idsafe(fp)} from "./${relImport}"`
                : `import * as ${idsafe(fp)} from "./${relImport}"`
          })
          .join("\n")}\n\n` +
        "export default {\n" +
        fps.map((fp) => `  "${fp}": ${idsafe(fp)}`).join(",\n") +
        "\n}"
      )
    }
    case "arraybuffer": {
      throw new Error("arraybuffer not yet implemented, contributions welcome")
    }
    case "export-pathlist": {
      return (
        "export default [\n" +
        Object.keys(vfs)
          .map((p) => `  "${p}"`)
          .join(",\n") +
        "\n]"
      )
    }
    case "import-bunfile": {
      if (!opts.targetPath) {
        throw new Error(
          "targetPath is required when using content-format of require,import-default,import-star",
        )
      }
      const basePath = toPosixPath(
        path.relative(path.dirname(opts.targetPath), opts.dirPath),
      )
      const fps = Object.keys(vfs)
      return (
        `${fps
          .map((fp) => {
            const relImport = basePath ? `${basePath}/${fp}` : fp
            return `import ${idsafe(fp)} from "./${relImport}" with { type: "file" };`
          })
          .join("\n")}\n\n` +
        'import { file } from "bun";\n\n' +
        "export default {\n" +
        fps.map((fp) => `  "${fp}": file(${idsafe(fp)})`).join(",\n") +
        "\n}"
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
