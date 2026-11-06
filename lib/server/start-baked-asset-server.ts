import { createServer } from "node:http"
import {
  readBakedAsset,
  resolveBakedAssetDirectory,
} from "lib/shared/baked-assets"
import { partsEngineBaseUrlEnvVars } from "lib/shared/parts-engine-base-urls"

export const startBakedAssetServer = async (
  directory = process.env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR,
) => {
  if (directory === undefined) return undefined
  const rootDirectory = await resolveBakedAssetDirectory(directory)

  const server = createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*")
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Methods": "GET, HEAD, POST",
      })
      response.end()
      return
    }
    if (
      request.method !== "GET" &&
      request.method !== "HEAD" &&
      !(
        request.method === "POST" &&
        request.headers["content-type"]?.startsWith(
          "application/x-www-form-urlencoded",
        )
      )
    ) {
      response.writeHead(405, { Allow: "GET, HEAD, POST, OPTIONS" })
      response.end()
      return
    }

    try {
      const url = new URL(request.url!, "http://localhost")
      if (request.method === "POST") {
        let body = ""
        for await (const chunk of request) body += chunk.toString()
        for (const [key, value] of new URLSearchParams(body))
          url.searchParams.append(key, value)
      }
      const { filePath, content } = await readBakedAsset(rootDirectory, url)
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
  process.env.TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL = serverOrigin
  for (const [providerPath, environmentVariable] of Object.entries(
    partsEngineBaseUrlEnvVars,
  )) {
    process.env[environmentVariable] = `${serverOrigin}/${providerPath}`
  }
  return server
}
