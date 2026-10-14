import { readFile, realpath, stat } from "node:fs/promises"
import { createServer } from "node:http"
import path from "node:path"
import { isWithinDirectory } from "lib/shared/jscdn-directory"
import { partsEngineBaseUrlEnvVars } from "lib/shared/parts-engine-base-urls"

const resolveBakedAssetFilePath = async (
  rootDirectory: string,
  requestUrl: string,
) => {
  const url = new URL(requestUrl, "http://localhost")
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
  if (!isWithinDirectory(rootDirectory, filePath))
    throw new Error("Invalid baked asset path")
  return filePath
}

export const startBakedAssetServer = async (
  directory = process.env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR,
) => {
  if (directory === undefined) return undefined
  if (!directory)
    throw new Error("TSCIRCUIT_BAKED_ASSET_SERVER_DIR must be a directory path")
  const rootDirectory = await realpath(directory)
  if (!(await stat(rootDirectory)).isDirectory())
    throw new Error(
      `Baked asset directory is not a directory: ${rootDirectory}`,
    )

  const server = createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*")
    if (request.method === "OPTIONS") {
      response.writeHead(204, { "Access-Control-Allow-Methods": "GET, HEAD" })
      response.end()
      return
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD, OPTIONS" })
      response.end()
      return
    }

    try {
      const filePath = await resolveBakedAssetFilePath(
        rootDirectory,
        request.url!,
      )
      const content = await readFile(filePath)
      response.writeHead(200, {
        "Content-Type": filePath.endsWith(".json")
          ? "application/json"
          : "application/octet-stream",
      })
      response.end(request.method === "HEAD" ? undefined : content)
    } catch {
      response.writeHead(404)
      response.end("Not found")
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  // Let short CLI commands exit when their work finishes.
  server.unref()
  const address = server.address()
  if (!address || typeof address === "string")
    throw new Error("Could not determine the baked asset server port")
  const serverOrigin = `http://127.0.0.1:${address.port}`
  for (const [providerPath, environmentVariable] of Object.entries(
    partsEngineBaseUrlEnvVars,
  )) {
    process.env[environmentVariable] = `${serverOrigin}/${providerPath}`
  }
  return server
}
