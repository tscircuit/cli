import * as http from "node:http"
import * as fs from "node:fs"
import { getNodeHandler } from "winterspec/adapters/node"
import pkg from "../../package.json"
// @ts-ignore
import runFrameStandaloneBundleContent from "@tscircuit/runframe/standalone" with {
  type: "text",
}

// @ts-ignore
import winterspecBundle from "@tscircuit/file-server/dist/bundle.js"
import { getIndex } from "../site/getIndex"

export const createHttpServer = async ({
  port = 3020,
  defaultMainComponentPath,
}: {
  port?: number
  defaultMainComponentPath?: string
}) => {
  const fileServerHandler = getNodeHandler(winterspecBundle as any, {})

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

    if (url.pathname === "/kicad-converter.js") {
      try {
        const build = await Bun.build({
          entrypoints: [require.resolve("kicad-component-converter")],
          target: "browser",
          format: "esm",
        })
        const content = await build.outputs[0].text()
        res.writeHead(200, { "Content-Type": "application/javascript" })
        res.end(content)
        return
      } catch (e) {
        console.error("Failed to bundle kicad-component-converter", e)
        res.writeHead(500)
        res.end("Internal Server Error")
        return
      }
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
