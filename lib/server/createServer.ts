import * as http from "http"
import { getNodeHandler } from "winterspec/adapters/node"
// @ts-ignore
import winterspecBundle from "@tscircuit/file-server/dist/bundle.js"
import { getIndex } from "../site/getIndex"

export const createServer = async (port: number = 3000) => {
  const fileServerHandler = getNodeHandler(winterspecBundle as any, {})

  const server = http.createServer(async (req, res) => {
    if (req.url === "/") {
      const html = await getIndex()
      res.writeHead(200, { "Content-Type": "text/html" })
      res.end(html)
      return
    }

    if (req.url?.startsWith("/api/")) {
      req.url = req.url.replace("/api/", "/")
      fileServerHandler(req, res)
      return
    }

    res.writeHead(404)
    res.end("Not found")
  })

  return new Promise<void>((resolve) => {
    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`)
      resolve()
    })
  })
}
