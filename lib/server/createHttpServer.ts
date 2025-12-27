import * as http from "node:http"
import * as fs from "node:fs"
import * as path from "node:path"
import { getNodeHandler } from "winterspec/adapters/node"
import pkg from "../../package.json"
import type { StaticBuildFileReference } from "lib/site/getStaticIndexHtmlFile"
// @ts-ignore
import runFrameStandaloneBundleContent from "@tscircuit/runframe/standalone" with {
  type: "text",
}

// @ts-ignore
import winterspecBundle from "@tscircuit/file-server/dist/bundle.js"
import { getIndex } from "../site/getIndex"
import { getStaticIndexHtmlFile } from "../site/getStaticIndexHtmlFile"

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
}

export const createHttpServer = async ({
  port = 3020,
  defaultMainComponentPath,
  staticBuild,
}: {
  port?: number
  defaultMainComponentPath?: string
  staticBuild?: {
    assetsDir: string
    files: StaticBuildFileReference[]
  }
}) => {
  const fileServerHandler = getNodeHandler(winterspecBundle as any, {})
  const staticAssetsDir = staticBuild
    ? path.resolve(staticBuild.assetsDir)
    : undefined
  const staticIndexHtml = staticBuild
    ? getStaticIndexHtmlFile({ files: staticBuild.files })
    : undefined

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url!, `http://${req.headers.host}`)

    if (url.pathname === "/standalone.min.js") {
      const standaloneFilePath = process.env.RUNFRAME_STANDALONE_FILE_PATH

      if (!standaloneFilePath) {
        res.writeHead(200, {
          "Content-Type": "application/javascript; charset=utf-8",
        })
        res.end(runFrameStandaloneBundleContent)
        return
      }

      try {
        const content = fs.readFileSync(standaloneFilePath, "utf8")
        res.writeHead(200, {
          "Content-Type": "application/javascript; charset=utf-8",
        })
        res.end(content)
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

    if (staticBuild) {
      if (url.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(staticIndexHtml)
        return
      }

      const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, "")
      if (!relativePath) {
        res.writeHead(404)
        res.end("Not found")
        return
      }

      const resolvedPath = path.resolve(staticAssetsDir!, relativePath)
      const assetsRoot = `${staticAssetsDir}${path.sep}`

      if (
        resolvedPath !== staticAssetsDir &&
        !resolvedPath.startsWith(assetsRoot)
      ) {
        res.writeHead(404)
        res.end("Not found")
        return
      }

      if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
        res.writeHead(404)
        res.end("Not found")
        return
      }

      const ext = path.extname(resolvedPath).toLowerCase()
      const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream"
      res.writeHead(200, { "Content-Type": contentType })
      res.end(fs.readFileSync(resolvedPath))
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
