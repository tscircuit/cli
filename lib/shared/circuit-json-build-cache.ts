import fs from "node:fs"
import path from "node:path"
import { createHash } from "node:crypto"
import type { AnyCircuitElement } from "circuit-json"

type SourceProjectMetadataWithFilesystemHash = Extract<
  AnyCircuitElement,
  { type: "source_project_metadata" }
> & {
  source_filesystem_md5_hash: string
}

const SOURCE_FILE_EXTENSIONS = new Set([
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".json",
  ".txt",
  ".md",
  ".obj",
  ".kicad_mod",
  ".kicad_pcb",
  ".kicad_pro",
  ".kicad_sch",
])

const IGNORED_DIRECTORY_NAMES = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
])

const isPathInside = (childPath: string, parentPath: string) => {
  const relative = path.relative(parentPath, childPath)
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  )
}

export const findCircuitProjectDir = (filePath: string) => {
  const absoluteFilePath = path.resolve(filePath)
  let currentDir = path.dirname(absoluteFilePath)

  while (true) {
    if (fs.existsSync(path.join(currentDir, "package.json"))) {
      return currentDir
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) break
    currentDir = parentDir
  }

  const cwd = path.resolve(process.cwd())
  return isPathInside(absoluteFilePath, cwd)
    ? cwd
    : path.dirname(absoluteFilePath)
}

export const getCircuitJsonOutputDirName = (relativePath: string) => {
  const normalizedRelativePath = relativePath
    .toLowerCase()
    .replaceAll("\\", "/")

  if (
    normalizedRelativePath === "circuit.json" ||
    normalizedRelativePath.endsWith("/circuit.json")
  ) {
    return path.dirname(relativePath)
  }

  return relativePath
    .replace(/(\.board|\.circuit)?\.tsx$/, "")
    .replace(/\.circuit\.json$/, "")
}

export const getCircuitJsonBuildOutputPath = (filePath: string) => {
  const absoluteFilePath = path.resolve(filePath)
  const projectDir = findCircuitProjectDir(absoluteFilePath)
  const relativePath = path.relative(projectDir, absoluteFilePath)
  return path.join(
    projectDir,
    "dist",
    getCircuitJsonOutputDirName(relativePath),
    "circuit.json",
  )
}

const getSourceFilePaths = (projectDir: string) => {
  const sourceFilePaths: string[] = []

  const visit = (directoryPath: string) => {
    const entries = fs
      .readdirSync(directoryPath, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name)

      if (entry.isDirectory()) {
        if (
          IGNORED_DIRECTORY_NAMES.has(entry.name) ||
          entry.name.startsWith(".")
        ) {
          continue
        }
        visit(entryPath)
        continue
      }

      if (
        !entry.isFile() ||
        entry.name.endsWith(".circuit.json") ||
        !SOURCE_FILE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      ) {
        continue
      }

      sourceFilePaths.push(entryPath)
    }
  }

  visit(projectDir)
  return sourceFilePaths
}

export const getSourceFilesystemMd5Hash = (filePath: string) => {
  const projectDir = findCircuitProjectDir(filePath)
  const hash = createHash("md5")

  for (const sourceFilePath of getSourceFilePaths(projectDir)) {
    const relativePath = path
      .relative(projectDir, sourceFilePath)
      .split(path.sep)
      .join("/")
    const content = fs.readFileSync(sourceFilePath)

    hash.update(`${Buffer.byteLength(relativePath)}:`)
    hash.update(relativePath)
    hash.update(`${content.byteLength}:`)
    hash.update(content)
  }

  return hash.digest("hex")
}

/** Adds the hash used to decide whether a build matches the current sources. */
export const addSourceFilesystemHash = (
  circuitJson: AnyCircuitElement[],
  sourceFilesystemMd5Hash: string,
) => {
  let foundProjectMetadata = false
  const circuitJsonWithHash = circuitJson.map((element) => {
    if (element.type !== "source_project_metadata") return element

    foundProjectMetadata = true
    const metadataWithHash: SourceProjectMetadataWithFilesystemHash = {
      ...element,
      source_filesystem_md5_hash: sourceFilesystemMd5Hash,
    }
    return metadataWithHash
  })

  if (!foundProjectMetadata) {
    const metadataWithHash: SourceProjectMetadataWithFilesystemHash = {
      type: "source_project_metadata",
      source_filesystem_md5_hash: sourceFilesystemMd5Hash,
    }
    circuitJsonWithHash.push(metadataWithHash)
  }

  return circuitJsonWithHash
}

/** Reads the normal `tsci build` output only when its source hash is current. */
export const readCurrentCircuitJsonBuild = ({
  filePath,
  sourceFilesystemMd5Hash,
}: {
  filePath: string
  sourceFilesystemMd5Hash: string
}) => {
  const outputPath = getCircuitJsonBuildOutputPath(filePath)

  try {
    const parsed = JSON.parse(fs.readFileSync(outputPath, "utf-8"))
    if (!Array.isArray(parsed)) return null

    const hasCurrentFilesystemHash = parsed.some(
      (element) =>
        element?.type === "source_project_metadata" &&
        element.source_filesystem_md5_hash === sourceFilesystemMd5Hash,
    )

    return hasCurrentFilesystemHash
      ? {
          circuitJson: parsed as AnyCircuitElement[],
          outputPath,
        }
      : null
  } catch {
    return null
  }
}
