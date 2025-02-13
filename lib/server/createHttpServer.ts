import * as http from "node:http"
import { getNodeHandler } from "winterspec/adapters/node"

// @ts-ignore
import winterspecBundle from "@tscircuit/file-server/dist/bundle.js"
import { getIndex } from "../site/getIndex"

export const createHttpServer = async (port = 3020) => {
  const fileServerHandler = getNodeHandler(winterspecBundle as any, {})

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url!, `http://${req.headers.host}`)

    if (req.url === "/standalone.min.js") {
      res.writeHead(302, {
        Location:
          "https://cdn.jsdelivr.net/npm/@tscircuit/runframe@0.0.167/dist/standalone.min.js",
        "Content-Type": "application/javascript; charset=utf-8",
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
