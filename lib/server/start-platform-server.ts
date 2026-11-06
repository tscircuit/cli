import { realpath, stat } from "node:fs/promises"
import { createServer } from "node:http"
import { fileURLToPath, pathToFileURL } from "node:url"
import { getPlatformBaseUrl } from "lib/shared/get-platform-base-url"
import { partsEngineBaseUrlEnvVars } from "lib/shared/parts-engine-base-urls"
import { readFileResponse } from "lib/shared/read-file-response"

/** Expose a file-backed platform over HTTP for browser consumers in dev. */
export const startPlatformServer = async () => {
  const baseUrl = getPlatformBaseUrl()
  if (!baseUrl || new URL(baseUrl).protocol !== "file:") return undefined
  const directory = await realpath(fileURLToPath(baseUrl))
  if (!(await stat(directory)).isDirectory())
    throw new Error(`Platform source is not a directory: ${directory}`)
  const root = new URL(`${pathToFileURL(directory).href}/`)

  const server = createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*")
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Methods": "GET, HEAD, POST",
      })
      response.end()
      return
    }
    try {
      const url = new URL(`.${request.url}`, root)
      let body: string | undefined
      if (request.method === "POST") {
        body = ""
        for await (const chunk of request) body += chunk.toString()
      }
      const result = await readFileResponse(
        root,
        new Request(url, {
          method: request.method,
          headers: { "content-type": request.headers["content-type"] ?? "" },
          body,
        }),
      )
      result.headers.forEach((value, key) => response.setHeader(key, value))
      response.writeHead(result.status)
      response.end(Buffer.from(await result.arrayBuffer()))
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
    throw new Error("Could not determine the platform server port")
  const serverOrigin = `http://127.0.0.1:${address.port}`
  process.env.TSCIRCUIT_PLATFORM_BASE_URL = serverOrigin
  for (const [providerPath, environmentVariable] of Object.entries(
    partsEngineBaseUrlEnvVars,
  ))
    process.env[environmentVariable] = `${serverOrigin}/${providerPath}`
  return server
}
