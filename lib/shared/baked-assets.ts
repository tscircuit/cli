import { readFile, realpath, stat } from "node:fs/promises"
import path from "node:path"
import { isWithinDirectory } from "./jscdn-directory"

export const resolveBakedAssetDirectory = async (directory: string) => {
  if (!directory)
    throw new Error("TSCIRCUIT_BAKED_ASSET_SERVER_DIR must be a directory path")
  const rootDirectory = await realpath(directory)
  if (!(await stat(rootDirectory)).isDirectory()) {
    throw new Error(
      `Baked asset directory is not a directory: ${rootDirectory}`,
    )
  }
  return rootDirectory
}

export const readBakedAsset = async (
  rootDirectory: string,
  requestUrl: URL,
  signal?: AbortSignal,
) => {
  const url = new URL(requestUrl)
  let requestPath = decodeURIComponent(url.pathname)
  if (url.search) {
    // /datasheets/get?chip_name=rp2040 -> /datasheets/get/chip_name%3Drp2040.json
    url.searchParams.sort()
    const sortedQuery = url.searchParams.toString()
    // encodeURIComponent leaves "*" unchanged, but Windows filenames forbid it.
    const encodedQuery = encodeURIComponent(sortedQuery).replace(/\*/g, "%2A")
    requestPath = path.join(requestPath, `${encodedQuery}.json`)
  }
  const filePath = await realpath(path.join(rootDirectory, requestPath))
  if (!isWithinDirectory(rootDirectory, filePath)) {
    throw new Error("Invalid baked asset path")
  }
  return { filePath, content: await readFile(filePath, { signal }) }
}
