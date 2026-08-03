import * as fs from "node:fs"
import * as http from "node:http"
import { createRequire } from "node:module"
import * as path from "node:path"
// @ts-ignore
import runFrameStandaloneBundleContent from "@tscircuit/runframe/standalone" with {
  type: "text",
}
import { getNodeHandler } from "winterspec/adapters/node"
import pkg from "../../package.json"

// @ts-ignore
import winterspecBundle from "@tscircuit/file-server/dist/bundle.js"
import { createLocalCacheEngine } from "../shared/get-platform-config-with-cli-defaults"
import { getIndex } from "../site/getIndex"
import { createKicadPcmProxy } from "./kicad-pcm-proxy"

const RUNFRAME_CACHE_PATH = "/__tscircuit/cache"
const RUNFRAME_EVAL_WORKER_PATH = "/__tscircuit/eval-webworker.js"
const GLOBAL_LOCAL_CACHE_ENGINE_SYMBOL_KEY = "tscircuit.localCacheEngine"
const cliRequire = createRequire(import.meta.url)

const injectEvalWorkerPath = (standaloneContent: string): string => {
  const propertyMarker = "evalWebWorkerBlobUrl:"
  const propertyIndex = standaloneContent.lastIndexOf(propertyMarker)
  if (propertyIndex === -1) return standaloneContent

  const valueStart = propertyIndex + propertyMarker.length
  const nextPropertyMatch = standaloneContent
    .slice(valueStart)
    .match(/,\s*enableFetchProxy\s*:/)
  if (nextPropertyMatch?.index === undefined) return standaloneContent

  const valueEnd = valueStart + nextPropertyMatch.index
  return `${standaloneContent.slice(0, valueStart)}${JSON.stringify(
    RUNFRAME_EVAL_WORKER_PATH,
  )}${standaloneContent.slice(valueEnd)}`
}

const getCacheWorkerPrelude = (): string => `
const tscircuitCacheFetch = globalThis.fetch.bind(globalThis)
const tscircuitCacheApiUrl = new URL(${JSON.stringify(RUNFRAME_CACHE_PATH)}, globalThis.location.href)
Reflect.set(globalThis, Symbol.for(${JSON.stringify(GLOBAL_LOCAL_CACHE_ENGINE_SYMBOL_KEY)}), {
  getItem: async (key) => {
    try {
      const url = new URL(tscircuitCacheApiUrl)
      url.searchParams.set("key", key)
      const response = await tscircuitCacheFetch(url)
      if (response.status === 404) return null
      if (!response.ok) return null
      return await response.text()
    } catch {
      return null
    }
  },
  setItem: async (key, value) => {
    try {
      const url = new URL(tscircuitCacheApiUrl)
      url.searchParams.set("key", key)
      await tscircuitCacheFetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: value,
      })
    } catch {}
  },
});
`

const resolveSiblingEvalWorkerPath = (
  standalonePath?: string,
): string | undefined => {
  if (!standalonePath) return undefined
  const workerPath = path.join(path.dirname(standalonePath), "webworker.min.js")
  return fs.existsSync(workerPath) ? workerPath : undefined
}

/**
 * Resolves the standalone runframe + eval bundle (`dist/browser.min.js`) shipped
 * by the `tscircuit` version installed in the user's project, so `tsci dev` uses
 * the version pinned in the project (like `bun run dev` would). Returns undefined
 * when it isn't installed locally, in which case the caller falls back to the
 * runframe bundled into the CLI.
 */
const resolveLocalTscircuitStandalonePath = (
  projectDir?: string,
): string | undefined => {
  if (!projectDir) return undefined
  try {
    const projectRequire = createRequire(path.join(projectDir, "package.json"))
    const browserBundlePath = projectRequire.resolve("tscircuit/browser")
    if (fs.existsSync(browserBundlePath)) return browserBundlePath
  } catch {
    // `tscircuit` isn't installed locally; fall back to the CLI-bundled runframe
  }
  return undefined
}

const readRequestBody = async (req: http.IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString("utf8")
}

export const createHttpServer = async ({
  port = 3020,
  defaultMainComponentPath,
  kicadPcm,
  projectDir,
  entryFile,
}: {
  port?: number
  defaultMainComponentPath?: string
  kicadPcm?: boolean
  projectDir?: string
  entryFile?: string
}) => {
  const fileServerHandler = getNodeHandler(winterspecBundle as any, {})
  const localCacheEngine = projectDir
    ? createLocalCacheEngine(path.join(projectDir, ".tscircuit", "cache"))
    : undefined

  // Create PCM proxy if enabled
  const pcmProxy =
    kicadPcm && projectDir && entryFile
      ? createKicadPcmProxy({ projectDir, entryFile, port })
      : null

  const server = http.createServer(async (req, res) => {
    const requestHost = req.headers.host ?? `localhost:${port}`
    const url = new URL(req.url!, `http://${requestHost}`)

    if (url.pathname === RUNFRAME_CACHE_PATH) {
      const key = url.searchParams.get("key")
      if (!localCacheEngine || !key) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" })
        res.end("A project directory and cache key are required")
        return
      }

      if (req.method === "GET") {
        const value = await localCacheEngine.getItem(key)
        if (value === null) {
          res.writeHead(404)
          res.end()
          return
        }
        res.writeHead(200, {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        })
        res.end(value)
        return
      }

      if (req.method === "POST") {
        await localCacheEngine.setItem(key, await readRequestBody(req))
        res.writeHead(204)
        res.end()
        return
      }

      res.writeHead(405, { Allow: "GET, POST" })
      res.end()
      return
    }

    if (url.pathname === RUNFRAME_EVAL_WORKER_PATH) {
      const localStandalonePath =
        resolveLocalTscircuitStandalonePath(projectDir)
      const evalWorkerPath =
        resolveSiblingEvalWorkerPath(localStandalonePath) ??
        resolveSiblingEvalWorkerPath(
          process.env.TSCIRCUIT_GLOBAL_STANDALONE_FILE_PATH,
        ) ??
        resolveSiblingEvalWorkerPath(
          process.env.RUNFRAME_STANDALONE_FILE_PATH,
        ) ??
        cliRequire.resolve("@tscircuit/eval/worker-entrypoint")

      try {
        const workerContent = fs.readFileSync(evalWorkerPath, "utf8")
        res.writeHead(200, {
          "Content-Type": "application/javascript; charset=utf-8",
        })
        res.end(`${getCacheWorkerPrelude()}\n${workerContent}`)
      } catch {
        res.writeHead(404)
        res.end("Eval worker not found")
      }
      return
    }

    if (
      url.pathname === "/api/files/upsert-multipart" &&
      req.method === "POST"
    ) {
      try {
        const request = new Request(url.toString(), {
          method: req.method,
          headers: req.headers as HeadersInit,
          body: req as unknown as BodyInit,
          duplex: "half",
        } as RequestInit)

        const formData = await request.formData()
        const filePath = formData.get("file_path")?.toString()
        const initiator = formData.get("initiator")?.toString()
        const binaryFile = formData.get("binary_file")

        if (!filePath || !(binaryFile instanceof Blob)) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(
            JSON.stringify({
              error:
                "Missing required multipart fields: file_path, binary_file",
            }),
          )
          return
        }

        const binaryContentB64 = Buffer.from(
          await binaryFile.arrayBuffer(),
        ).toString("base64")

        const upstreamResponse = await fetch(
          `http://${requestHost}/api/files/upsert`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              file_path: filePath,
              initiator,
              binary_content_b64: binaryContentB64,
            }),
          },
        )

        const responseText = await upstreamResponse.text()
        res.writeHead(upstreamResponse.status, {
          "Content-Type":
            upstreamResponse.headers.get("content-type") ?? "application/json",
        })
        res.end(responseText)
        return
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" })
        res.end(
          JSON.stringify({
            error_code: "MULTIPART_UPLOAD_FAILED",
            message:
              error instanceof Error
                ? error.message
                : "Failed to process multipart upload",
          }),
        )
        return
      }
    }

    if (url.pathname === "/standalone.min.js") {
      const explicitStandalonePath = process.env.RUNFRAME_STANDALONE_FILE_PATH

      if (!explicitStandalonePath) {
        // Prefer the locally installed tscircuit version's bundle so `tsci dev`
        // automatically uses the version pinned in the project when available.
        const localStandalonePath =
          resolveLocalTscircuitStandalonePath(projectDir)
        if (localStandalonePath) {
          try {
            const content = fs.readFileSync(localStandalonePath, "utf8")
            res.writeHead(200, {
              "Content-Type": "application/javascript; charset=utf-8",
            })
            res.end(injectEvalWorkerPath(content))
            return
          } catch {
            // fall back to the global tscircuit bundle, then the CLI
          }
        }

        // Otherwise use the bundle from the globally installed tscircuit (the one
        // that provides the `tsci` binary, set by tscircuit's cli.mjs).
        const globalStandalonePath =
          process.env.TSCIRCUIT_GLOBAL_STANDALONE_FILE_PATH
        if (globalStandalonePath) {
          try {
            const content = fs.readFileSync(globalStandalonePath, "utf8")
            res.writeHead(200, {
              "Content-Type": "application/javascript; charset=utf-8",
            })
            res.end(injectEvalWorkerPath(content))
            return
          } catch {
            // fall back to the CLI-bundled runframe standalone below
          }
        }

        res.writeHead(200, {
          "Content-Type": "application/javascript; charset=utf-8",
        })
        res.end(injectEvalWorkerPath(runFrameStandaloneBundleContent))
        return
      }

      try {
        const content = fs.readFileSync(explicitStandalonePath, "utf8")
        res.writeHead(200, {
          "Content-Type": "application/javascript; charset=utf-8",
        })
        res.end(injectEvalWorkerPath(content))
        return
      } catch (error) {
        console.info(
          "Local runframe standalone not found, falling back to the production version.",
        )
      }

      res.writeHead(302, {
        Location: `https://cdn.jsdelivr.net/npm/@tscircuit/runframe@${{ ...pkg.devDependencies }["@tscircuit/runframe"].replace(/^[^0-9]+/, "")}/dist/standalone.min.js`,
      })
      res.end()
      return
    }

    if (url.pathname === "/") {
      const fileServerApiBaseUrl = `http://${req.headers.host}/api`
      const html = await getIndex(
        defaultMainComponentPath,
        fileServerApiBaseUrl,
      )
      res.writeHead(200, { "Content-Type": "text/html" })
      res.end(html)
      return
    }

    // Handle PCM proxy requests
    if (pcmProxy && url.pathname.startsWith("/pcm")) {
      await pcmProxy.handleRequest(url, res)
      return
    }

    if (url.pathname.startsWith("/api/")) {
      req.url = req.url!.replace("/api/", "/")
      fileServerHandler(req, res)
      return
    }

    res.writeHead(404)
    res.end("Not found")
  })

  return new Promise<{ server: http.Server }>((resolve) => {
    server.listen(port, () => {
      resolve({ server })
    })
  })
}
