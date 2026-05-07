import path from "node:path"

export type BuildFileMetadata = {
  displayPath: string
  outputDirName: string
  staticSourcePath: string
}

const getOutputDirName = (relativePath: string) => {
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

export const getBuildFileMetadata = ({
  filePath,
  projectDir,
  inlineBuildFilePath,
}: {
  filePath: string
  projectDir: string
  inlineBuildFilePath?: string
}): BuildFileMetadata => {
  if (
    inlineBuildFilePath &&
    path.resolve(filePath) === path.resolve(inlineBuildFilePath)
  ) {
    return {
      displayPath: "inline.tsx",
      outputDirName: "inline",
      staticSourcePath: "inline.tsx",
    }
  }

  const displayPath = path.relative(projectDir, filePath)

  return {
    displayPath,
    outputDirName: getOutputDirName(displayPath),
    staticSourcePath: displayPath.split(path.sep).join("/"),
  }
}
