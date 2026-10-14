import { readFile, realpath, stat } from "node:fs/promises"
import { createServer } from "node:http"
import path from "node:path"
import { isWithinDirectory } from "lib/shared/jscdn-directory"
import { partsEngineBaseUrlEnvVars } from "lib/shared/parts-engine-base-urls"

export const startBakedAssetServer = async (
  directory = process.env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR,
) => {
  if (directory === undefined) return undefined
  if (!directory)
    throw new Error("TSCIRCUIT_BAKED_ASSET_SERVER_DIR must be a directory path")
  const root = await realpath(directory)
  if (!(await stat(root)).isDirectory())
    throw new Error(`Baked asset directory is not a directory: ${root}`)

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
      const url = new URL(request.url!, "http://localhost")
      url.searchParams.sort()
      // Query responses live under the endpoint, keyed by the encoded query.
      const queryFile = url.search
        ? `${encodeURIComponent(url.searchParams.toString()).replace(/\*/g, "%2A")}.json`
        : ""
      const filePath = await realpath(
        path.join(root, decodeURIComponent(url.pathname), queryFile),
      )
      if (!isWithinDirectory(root, filePath))
        throw new Error("Invalid baked asset path")
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
  server.unref()
  const address = server.address()
  if (!address || typeof address === "string")
    throw new Error("Could not determine the baked asset server port")
  for (const [provider, name] of Object.entries(partsEngineBaseUrlEnvVars)) {
    process.env[name] = `http://127.0.0.1:${address.port}/${provider}`
  }
  return server
}
