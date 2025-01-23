import * as http from "node:http"
import * as fs from "node:fs"
import * as path from "node:path"
import { getNodeHandler } from "winterspec/adapters/node"
import pkg from "../../package.json"
import type { AddressInfo } from "node:net"

// @ts-ignore
import winterspecBundle from "@tscircuit/file-server/dist/bundle.js"
import { getIndex } from "../site/getIndex"

export const createHttpServer = async (initialPort = 3020) => {
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

  return new Promise<{ server: http.Server }>((resolve, reject) => {
    const tryPort = (currentPort: number) => {
      server.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          // Try next port
          const nextPort = currentPort + 1
          if (nextPort < initialPort + 10) {
            // Try up to 10 ports
            console.log(`Port ${currentPort} in use, trying ${nextPort}...`)
            tryPort(nextPort)
          } else {
            reject(
              new Error(
                `Unable to find available port in range ${initialPort}-${initialPort + 9}`,
              ),
            )
          }
        } else {
          reject(err)
        }
      })

      server.listen(currentPort, () => {
        const address = server.address() as AddressInfo
        console.log(`Server running at http://localhost:${address.port}`)
        resolve({ server })
      })
    }

    tryPort(initialPort)
  })
}
