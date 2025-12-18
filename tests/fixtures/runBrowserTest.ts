import JSZip from "jszip"
import { DevServer } from "cli/dev/DevServer"
import { generateTsConfig } from "lib/shared/generate-ts-config"
import { chromium, type Browser, type Page } from "playwright"
import getPort from "get-port"
import * as fs from "node:fs"
import * as path from "node:path"
import { temporaryDirectory } from "tempy"
import ky from "ky"
import { execSync } from "node:child_process"

interface RunBrowserTestOptions {
  /**
   * The bug report ID to download and test
   */
  bugReportId: string
  /**
   * Optional callback to modify files in the temporary directory before running.
   * Receives the tmpDir path and can be used to modify package.json, source files, etc.
   */
  modifyFs?: (tmpDir: string) => void | Promise<void>
  /**
   * Timeout for waiting for render to complete (default: 60000ms)
   */
  timeout?: number
  /**
   * Whether to keep the browser open for debugging (default: false)
   */
  debug?: boolean
  /**
   * Custom registry API URL (default: https://registry-api.tscircuit.com)
   */
  registryApiUrl?: string
}

interface RunBrowserTestResult {
  circuitJson: any[]
  errors: Array<any>
  hasExecutionError: boolean
  renderLogs: string[]
  tmpDir: string
}

const getCommonDirectoryPrefix = (paths: string[]) => {
  if (paths.length === 0) return ""
  const splitPaths = paths.map((p) => p.split("/").filter(Boolean))
  const minLength = Math.min(
    ...splitPaths.map((parts) => (parts.length === 0 ? 0 : parts.length)),
  )
  const commonSegments: string[] = []

  for (let i = 0; i < Math.max(0, minLength - 1); i++) {
    const segment = splitPaths[0][i]
    if (!segment) break
    const allMatch = splitPaths.every((parts) => parts[i] === segment)
    if (!allMatch) break
    commonSegments.push(segment)
  }

  return commonSegments.join("/")
}

const sanitizeRelativePath = (relativePath: string) => {
  const normalizedPath = path.normalize(relativePath)
  if (!normalizedPath) return null
  if (path.isAbsolute(normalizedPath)) return null
  const segments = normalizedPath.split(path.sep)
  if (segments.some((segment) => segment === ".." || segment === "")) {
    return null
  }
  return normalizedPath
}

/**
 * Wait for a RUN_COMPLETED event from the file-server events API
 */
async function waitForRunCompleted(
  fsKyUrl: string,
  timeout: number,
): Promise<{ errors: any[]; hasExecutionError: boolean; circuitJson?: any[] }> {
  const startTime = Date.now()
  const fsKy = ky.create({ prefixUrl: fsKyUrl })

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fsKy.get("api/events/list").json<{
        event_list: Array<{
          event_id: string
          event_type: string
          created_at: string
          errors?: any[]
          hasExecutionError?: boolean
          circuitJson?: any[]
          [key: string]: any
        }>
      }>()

      // Look for RUN_COMPLETED event
      const runCompletedEvent = response.event_list.find(
        (e) => e.event_type === "RUN_COMPLETED",
      )

      if (runCompletedEvent) {
        return {
          errors: runCompletedEvent.errors ?? [],
          hasExecutionError: runCompletedEvent.hasExecutionError ?? false,
          circuitJson: runCompletedEvent.circuitJson,
        }
      }
    } catch (err) {
      // Ignore errors and keep polling
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(`Timeout waiting for RUN_COMPLETED event after ${timeout}ms`)
}

/**
 * Downloads a bug report, runs it in a browser with the DevServer,
 * and returns the render result including any errors.
 */
export async function runBrowserTest(
  options: RunBrowserTestOptions,
): Promise<RunBrowserTestResult> {
  const {
    bugReportId,
    modifyFs,
    timeout = 60000,
    debug = false,
    registryApiUrl = "https://registry-api.tscircuit.com",
  } = options

  const trimmedBugReportId = bugReportId.trim()
  if (!trimmedBugReportId) {
    throw new Error("Bug report ID must not be empty.")
  }

  // Create temporary directory
  const tmpDir = temporaryDirectory()

  // Download bug report zip
  const registryKy = ky.create({ prefixUrl: registryApiUrl })
  let zipBuffer: ArrayBuffer
  try {
    zipBuffer = await registryKy
      .get("bug_reports/download_zip", {
        searchParams: {
          bug_report_id: trimmedBugReportId,
        },
      })
      .arrayBuffer()
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as any).status === 404
    ) {
      throw new Error(
        `Bug report "${trimmedBugReportId}" not found. Please check the ID and try again.`,
      )
    }
    throw new Error(
      `Failed to download bug report: ${error instanceof Error ? error.message : error}`,
    )
  }

  // Extract zip
  const zip = await JSZip.loadAsync(zipBuffer)
  const fileEntries = Object.entries(zip.files).filter(
    ([, entry]) => !entry.dir,
  )
  const commonPrefix = getCommonDirectoryPrefix(
    fileEntries.map(([fileName]) => fileName),
  )

  let mainComponentPath: string | undefined

  for (const [fileName, entry] of fileEntries) {
    const prefixWithSlash = commonPrefix ? `${commonPrefix}/` : ""
    const withoutPrefix = fileName.startsWith(prefixWithSlash)
      ? fileName.slice(prefixWithSlash.length)
      : fileName
    const sanitizedRelativePath = sanitizeRelativePath(withoutPrefix)

    if (!sanitizedRelativePath) {
      console.warn(`Skipping potentially unsafe path: ${fileName}`)
      continue
    }

    const fullPath = path.join(tmpDir, sanitizedRelativePath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    const fileContent = await entry.async("nodebuffer")
    fs.writeFileSync(fullPath, fileContent)

    // Detect main component file
    if (
      !mainComponentPath &&
      (sanitizedRelativePath.endsWith(".tsx") ||
        sanitizedRelativePath.endsWith(".ts"))
    ) {
      if (
        sanitizedRelativePath.includes("index") ||
        sanitizedRelativePath.includes("main") ||
        sanitizedRelativePath.includes("circuit")
      ) {
        mainComponentPath = fullPath
      }
    }
  }

  // If no main component found, look for any tsx file
  if (!mainComponentPath) {
    const files = fs.readdirSync(tmpDir)
    const tsxFile = files.find((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
    if (tsxFile) {
      mainComponentPath = path.join(tmpDir, tsxFile)
    }
  }

  if (!mainComponentPath) {
    throw new Error("No TypeScript/TSX entry point found in bug report")
  }

  // Apply file modifications if provided
  if (modifyFs) {
    await modifyFs(tmpDir)
  }

  // Generate tsconfig
  generateTsConfig(tmpDir)

  // Write .npmrc
  fs.writeFileSync(
    path.join(tmpDir, ".npmrc"),
    "@tsci:registry=https://npm.tscircuit.com",
  )

  // Install dependencies
  try {
    execSync("bun install", {
      cwd: tmpDir,
      stdio: "inherit",
      env: {
        ...process.env,
        // Isolate all Bun caches per-test to avoid cross-test pollution that
        // can lead to different dependency resolutions (e.g., zod version mismatches
        // causing "keyValidator._parse is not a function"). Using tmp-local paths
        // keeps installs hermetic regardless of test execution order.
        BUN_INSTALL_CACHE: path.join(tmpDir, ".bun-install-cache"),
        BUN_INSTALL_GLOBAL_DIR: path.join(tmpDir, ".bun-global"),
        BUN_RUNTIME_TRANSPILER_CACHE_PATH: path.join(
          tmpDir,
          ".bun-transpiler-cache",
        ),
      },
    })
  } catch (error) {
    console.warn(
      `Warning: Failed to install dependencies: ${error instanceof Error ? error.message : error}`,
    )
  }

  // Start DevServer
  const port = await getPort()
  const devServer = new DevServer({
    port,
    componentFilePath: mainComponentPath,
    projectDir: tmpDir,
  })

  await devServer.start()

  const fsUrl = `http://localhost:${port}`

  // Launch browser
  let browser: Browser | undefined
  let page: Page | undefined

  try {
    browser = await chromium.launch({
      headless: !debug,
    })
    page = await browser.newPage()

    const result: RunBrowserTestResult = {
      circuitJson: [],
      errors: [],
      hasExecutionError: false,
      renderLogs: [],
      tmpDir,
    }

    // Capture console logs for debugging
    page.on("console", (msg) => {
      result.renderLogs.push(`[${msg.type()}] ${msg.text()}`)
    })

    // Navigate to the DevServer - this triggers the run automatically
    await page.goto(fsUrl, {
      waitUntil: "domcontentloaded",
      timeout: timeout,
    })

    // Wait for RUN_COMPLETED event from the file-server
    const runResult = await waitForRunCompleted(fsUrl, timeout)

    result.errors = runResult.errors
    result.hasExecutionError = runResult.hasExecutionError
    if (runResult.circuitJson) {
      result.circuitJson = runResult.circuitJson
    }

    return result
  } finally {
    // Cleanup
    if (!debug) {
      if (page) await page.close()
      if (browser) await browser.close()
      await devServer.stop()
    } else {
      // Register cleanup for debug mode
      globalThis.deferredCleanupFns.push(async () => {
        if (page) await page.close()
        if (browser) await browser.close()
        await devServer.stop()
      })
    }
  }
}
