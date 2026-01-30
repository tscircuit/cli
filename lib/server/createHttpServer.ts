import * as http from "node:http"
import * as fs from "node:fs"
import * as path from "node:path"
import { getNodeHandler } from "winterspec/adapters/node"
import pkg from "../../package.json"
import kleur from "kleur"
// @ts-ignore
import runFrameStandaloneBundleContent from "@tscircuit/runframe/standalone" with {
  type: "text",
}

// @ts-ignore
import winterspecBundle from "@tscircuit/file-server/dist/bundle.js"
import { getIndex } from "../site/getIndex"
import { buildKicadPcm } from "cli/build/build-kicad-pcm"
import { globbySync } from "globby"

interface PcmProxyState {
  lastBuildTime: number
  lastFileChecksum: string
  isBuilding: boolean
  buildPromise: Promise<{ success: boolean; error?: string }> | null
  lastBuildError: string | null
}

const getSourceFilesChecksum = (projectDir: string): string => {
  const sourceFiles = globbySync(
    ["**/*.tsx", "**/*.ts", "**/*.json", "!node_modules/**", "!dist/**"],
    { cwd: projectDir },
  )

  let checksum = ""
  for (const file of sourceFiles) {
    try {
      const stat = fs.statSync(path.join(projectDir, file))
      checksum += `${file}:${stat.mtimeMs};`
    } catch {
      // File may have been deleted
    }
  }
  return checksum
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

  // State for PCM proxy
  const pcmState: PcmProxyState = {
    lastBuildTime: 0,
    lastFileChecksum: "",
    isBuilding: false,
    buildPromise: null,
    lastBuildError: null,
  }

  const handlePcmRequest = async (
    url: URL,
    res: http.ServerResponse,
  ): Promise<void> => {
    if (!projectDir || !entryFile) {
      res.writeHead(500)
      res.end("PCM proxy not configured properly")
      return
    }

    // Get requested file path (e.g., /pcm/repository.json -> repository.json)
    const requestedFile =
      url.pathname.replace(/^\/pcm\/?/, "") || "repository.json"
    const distDir = path.join(projectDir, "dist")
    const pcmDir = path.join(distDir, "pcm")
    const filePath = path.join(pcmDir, requestedFile)

    // Check if files have changed since last build
    const currentChecksum = getSourceFilesChecksum(projectDir)
    const needsRebuild = currentChecksum !== pcmState.lastFileChecksum

    if (needsRebuild) {
      // If already building, wait for that build to complete
      if (pcmState.isBuilding && pcmState.buildPromise) {
        const result = await pcmState.buildPromise
        if (!result.success) {
          res.writeHead(500)
          res.end(`PCM build failed: ${result.error}`)
          return
        }
      } else {
        // Start a new build
        pcmState.isBuilding = true
        pcmState.lastBuildError = null
        console.log(kleur.blue("\nRebuilding KiCad PCM assets..."))
        console.log(kleur.gray(`  Entry file: ${entryFile}`))
        console.log(kleur.gray(`  Project dir: ${projectDir}`))

        pcmState.buildPromise = buildKicadPcm({
          entryFile,
          projectDir,
          distDir,
        })
          .then(() => {
            pcmState.lastFileChecksum = currentChecksum
            pcmState.lastBuildTime = Date.now()
            pcmState.lastBuildError = null
            console.log(kleur.green("KiCad PCM assets rebuilt successfully"))
            return { success: true as const }
          })
          .catch((error) => {
            const errorMsg =
              error instanceof Error ? error.message : String(error)
            console.error(kleur.red("Failed to build KiCad PCM assets:"), error)
            pcmState.lastBuildError = errorMsg
            return { success: false as const, error: errorMsg }
          })
          .finally(() => {
            pcmState.isBuilding = false
          })

        const result = await pcmState.buildPromise
        if (!result.success) {
          res.writeHead(500)
          res.end(`PCM build failed: ${result.error}`)
          return
        }
      }
    }

    // Serve the requested file
    if (!fs.existsSync(filePath)) {
      res.writeHead(404)
      res.end(`PCM file not found: ${requestedFile}`)
      return
    }

    const ext = path.extname(filePath).toLowerCase()
    let contentType = "application/octet-stream"
    if (ext === ".json") {
      contentType = "application/json"
    } else if (ext === ".zip") {
      contentType = "application/zip"
    }

    try {
      const content = fs.readFileSync(filePath)
      res.writeHead(200, { "Content-Type": contentType })
      res.end(content)
    } catch (error) {
      res.writeHead(500)
      res.end(`Error reading PCM file: ${error}`)
    }
  }

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
    if (kicadPcm && url.pathname.startsWith("/pcm")) {
      await handlePcmRequest(url, res)
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
