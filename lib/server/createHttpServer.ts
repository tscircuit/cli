import * as http from "node:http"
import * as fs from "node:fs"
import * as path from "node:path"
import { getNodeHandler } from "winterspec/adapters/node"
import pkg from "../../package.json"

// @ts-ignore
import winterspecBundle from "@tscircuit/file-server/dist/bundle.js"
import { getIndex } from "../site/getIndex"

export const createHttpServer = async (port = 3020) => {
  const fileServerHandler = getNodeHandler(winterspecBundle as any, {})

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url!, `http://${req.headers.host}`)

    if (url.pathname === "/standalone.min.js") {
      const standaloneFilePath =
        process.env.RUNFRAME_STANDALONE_FILE_PATH ||
        path.resolve(
          process.cwd(),
          "node_modules",
          "@tscircuit/runframe/dist/standalone.min.js",
        )

      try {
        const content = fs.readFileSync(standaloneFilePath, "utf8")
        res.writeHead(200, {
          "Content-Type": "application/javascript; charset=utf-8",
        })
        res.end(content)
        return
      } catch (error) {
        console.error("Error serving standalone.min.js:", error)
      }

      res.writeHead(302, {
        Location: `https://cdn.jsdelivr.net/npm/@tscircuit/runframe@${pkg.dependencies["@tscircuit/runframe"].replace(/^[^0-9]+/, "")}/dist/standalone.min.js`,
      })
      res.end()
      return
    }

    if (url.pathname === "/") {
      const html = await getIndex()
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
      console.log(`Server running at http://localhost:${port}`)
      resolve({ server })
    })
  })
}
