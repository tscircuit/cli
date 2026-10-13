import { statSync } from "node:fs"
import { cp } from "node:fs/promises"
import path from "node:path"

export const getJscdnDir = (
  directory = process.env.TSCIRCUIT_JSCDN_DIR,
): string | undefined => {
  if (directory === undefined) return undefined
  if (!directory)
    throw new Error("TSCIRCUIT_JSCDN_DIR must be a directory path")
  const sourceDir = path.resolve(directory)
  try {
    if (statSync(sourceDir).isDirectory()) return sourceDir
  } catch {}
  throw new Error(
    `JS CDN directory does not exist or is not a directory: ${sourceDir}`,
  )
}

export const getSiteJscdnDir = (bundleJscdn = false) => {
  const standaloneJscdn =
    process.env.TSCIRCUIT_STANDALONE === "1" &&
    process.env.TSCIRCUIT_JSCDN_DIR !== undefined
  if (!bundleJscdn && !standaloneJscdn) return undefined
  const directory = getJscdnDir()
  if (!directory)
    throw new Error(
      "--bundle-jscdn requires TSCIRCUIT_JSCDN_DIR to point to prepared JS CDN packages",
    )
  return directory
}

export const isWithinDirectory = (directory: string, filePath: string) => {
  const relative = path.relative(directory, filePath)
  return (
    relative === "" ||
    (!path.isAbsolute(relative) &&
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`))
  )
}

export const copyJscdnFiles = async (sourceDir: string, outputDir: string) => {
  const source = path.resolve(sourceDir)
  const output = path.resolve(outputDir)
  if (source === output) return
  if (isWithinDirectory(source, output) || isWithinDirectory(output, source)) {
    throw new Error(
      "The JS CDN source and output directories must not contain each other",
    )
  }
  await cp(source, output, { recursive: true, dereference: true })
}
