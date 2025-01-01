import * as http from "http"
import * as fs from "fs"
import * as path from "path"
import { getNodeHandler } from "winterspec/adapters/node"
// @ts-ignore
import winterspecBundle from "@tscircuit/file-server/dist/bundle"
import { getIndex } from "../site/getIndex"

export const createServer = async (port: number = 3000) => {
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
        res.writeHead(404)
        res.end("File not found")
        return
      }
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

  return new Promise<void>((resolve) => {
    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`)
      resolve()
    })
  })
}
