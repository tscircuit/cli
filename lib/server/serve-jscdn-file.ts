import * as fs from "node:fs"
import type * as http from "node:http"
import path from "node:path"

export const getJscdnDir = (
  directory = process.env.TSCIRCUIT_JSCDN_DIR,
): string | undefined => {
  if (directory === undefined) return undefined
  if (!directory) throw new Error("JS CDN directory must be a directory path")
  const sourceDir = path.resolve(directory)
  try {
    if (fs.statSync(sourceDir).isDirectory()) return sourceDir
  } catch {}
  throw new Error(
    `JS CDN directory does not exist or is not a directory: ${sourceDir}`,
  )
}

const isWithinDirectory = (directory: string, filePath: string) => {
  const relative = path.relative(directory, filePath)
  return (
    relative === "" ||
    (!path.isAbsolute(relative) &&
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`))
  )
}

const contentTypes: Record<string, string> = {
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
}

export const serveJscdnFile = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  directory?: string,
) => {
  if (!directory) {
    res.writeHead(404)
    res.end("Not found")
    return
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" })
    res.end()
    return
  }
  let relativePath: string
  try {
    relativePath = decodeURIComponent(pathname.slice("/jscdn/".length))
    if (relativePath.includes("\0")) throw new Error("Invalid path")
  } catch {
    res.writeHead(400)
    res.end("Invalid path")
    return
  }
  const filePath = path.resolve(directory, relativePath)
  if (!isWithinDirectory(directory, filePath)) {
    res.writeHead(404)
    res.end("Not found")
    return
  }
  try {
    // Restrict symlinks as well as lexical paths to the prepared directory.
    if (
      !isWithinDirectory(
        fs.realpathSync(directory),
        fs.realpathSync(filePath),
      ) ||
      !fs.statSync(filePath).isFile()
    ) {
      res.writeHead(404)
      res.end("Not found")
      return
    }
    const content = fs.readFileSync(filePath)
    const contentType =
      path.basename(filePath) === "+esm"
        ? "application/javascript; charset=utf-8"
        : (contentTypes[path.extname(filePath)] ?? "application/octet-stream")
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": content.byteLength,
    })
    res.end(req.method === "HEAD" ? undefined : content)
  } catch {
    res.writeHead(404)
    res.end("Not found")
  }
}
