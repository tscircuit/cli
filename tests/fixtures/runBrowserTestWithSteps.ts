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

// ============================================================================
// Types
// ============================================================================

interface CloneBugReportStep {
  stepType: "clone_bug_report"
  /**
   * The bug report ID to clone
   */
  bugReportId: string
  /**
   * Optional callback to modify files after extraction but before install
   */
  modifyFs?: (tmpDir: string) => void | Promise<void>
  /**
   * Optional script to run after bun install (e.g., "bun link")
   */
  postInstallScript?: string
  /**
   * Package names to link into this project using `bun link <package-name>`.
   * These packages must have been previously registered with `bun link` in an earlier step.
   */
  linkPackages?: string[]
}

interface RunBrowserTestStep {
  stepType: "run_browser_test"
  /**
   * Which cloned bug report to run the browser test in.
   * References a bugReportId from a previous clone_bug_report step.
   */
  clonedBugReportId: string
  /**
   * Timeout for waiting for render to complete (default: 60000ms)
   */
  timeout?: number
  /**
   * Whether to keep the browser open for debugging (default: false)
   */
  debug?: boolean
}

type TestStep = CloneBugReportStep | RunBrowserTestStep

interface RunBrowserTestWithStepsOptions {
  /**
   * Custom registry API URL (default: https://registry-api.tscircuit.com)
   */
  registryApiUrl?: string
}

interface ClonedBugReport {
  bugReportId: string
  tmpDir: string
  mainComponentPath: string
}

interface RunBrowserTestWithStepsResult {
  /**
   * Map of bugReportId to their cloned directories
   */
  clonedReports: Map<string, ClonedBugReport>
  /**
   * The browser test result (if run_browser_test step was executed)
   */
  browserTestResult?: {
    circuitJson: any[]
    errors: Array<any>
    hasExecutionError: boolean
    renderLogs: string[]
    tmpDir: string
  }
}

// ============================================================================
// Helper functions
// ============================================================================

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
 * Clone a bug report to a temporary directory
 */
async function cloneBugReportToTmpDir(
  bugReportId: string,
  registryApiUrl: string,
): Promise<ClonedBugReport> {
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
    throw new Error(
      `No TypeScript/TSX entry point found in bug report ${bugReportId}`,
    )
  }

  return {
    bugReportId: trimmedBugReportId,
    tmpDir,
    mainComponentPath,
  }
}

/**
 * Execute a clone_bug_report step
 */
async function executeCloneBugReportStep(
  step: CloneBugReportStep,
  registryApiUrl: string,
): Promise<ClonedBugReport> {
  const clonedReport = await cloneBugReportToTmpDir(
    step.bugReportId,
    registryApiUrl,
  )

  // Apply file modifications if provided
  if (step.modifyFs) {
    await step.modifyFs(clonedReport.tmpDir)
  }

  // Generate tsconfig
  generateTsConfig(clonedReport.tmpDir)

  // Write .npmrc
  fs.writeFileSync(
    path.join(clonedReport.tmpDir, ".npmrc"),
    "@tsci:registry=https://npm.tscircuit.com",
  )

  // Install dependencies
  try {
    execSync("bun install", {
      cwd: clonedReport.tmpDir,
      stdio: "inherit",
    })
  } catch (error) {
    console.warn(
      `Warning: Failed to install dependencies: ${error instanceof Error ? error.message : error}`,
    )
  }

  // Run post-install script if provided (e.g., "bun link")
  if (step.postInstallScript) {
    try {
      execSync(step.postInstallScript, {
        cwd: clonedReport.tmpDir,
        stdio: "inherit",
      })
    } catch (error) {
      console.warn(
        `Warning: Post-install script failed: ${error instanceof Error ? error.message : error}`,
      )
    }
  }

  // Link packages from previously cloned repos
  if (step.linkPackages && step.linkPackages.length > 0) {
    for (const packageName of step.linkPackages) {
      try {
        console.log(
          `Linking package "${packageName}" into ${clonedReport.tmpDir}`,
        )
        execSync(`bun link ${packageName}`, {
          cwd: clonedReport.tmpDir,
          stdio: "inherit",
        })
      } catch (error) {
        console.warn(
          `Warning: Failed to link package "${packageName}": ${error instanceof Error ? error.message : error}`,
        )
      }
    }
  }

  return clonedReport
}

/**
 * Execute a run_browser_test step
 */
async function executeRunBrowserTestStep(
  step: RunBrowserTestStep,
  clonedReports: Map<string, ClonedBugReport>,
): Promise<RunBrowserTestWithStepsResult["browserTestResult"]> {
  const clonedReport = clonedReports.get(step.clonedBugReportId)
  if (!clonedReport) {
    throw new Error(
      `Bug report "${step.clonedBugReportId}" was not cloned in a previous step. ` +
        `Available: ${Array.from(clonedReports.keys()).join(", ")}`,
    )
  }

  const { tmpDir, mainComponentPath } = clonedReport
  const timeout = step.timeout ?? 60000
  const debug = step.debug ?? false

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

    const result = {
      circuitJson: [] as any[],
      errors: [] as any[],
      hasExecutionError: false,
      renderLogs: [] as string[],
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

// ============================================================================
// Main function
// ============================================================================

/**
 * Runs a sequence of test steps including cloning bug reports and running browser tests.
 *
 * This allows testing scenarios where multiple packages need to be cloned and linked
 * together using `bun link` before running a browser test.
 *
 * @example
 * ```ts
 * const result = await runBrowserTestWithSteps([
 *   {
 *     stepType: "clone_bug_report",
 *     bugReportId: "35b2ec78-e859-48e3-860c-3e420c7533f0",
 *     modifyFs(tmpDir) {
 *       console.log(fs.readFileSync(path.join(tmpDir, "package.json"), "utf-8"))
 *     },
 *     postInstallScript: "bun link"
 *   },
 *   {
 *     stepType: "clone_bug_report",
 *     bugReportId: "another-bug-report-id",
 *     postInstallScript: "bun link some-package-name"
 *   },
 *   {
 *     stepType: "run_browser_test",
 *     clonedBugReportId: "another-bug-report-id"
 *   }
 * ])
 * ```
 */
export async function runBrowserTestWithSteps(
  steps: TestStep[],
  options: RunBrowserTestWithStepsOptions = {},
): Promise<RunBrowserTestWithStepsResult> {
  const registryApiUrl =
    options.registryApiUrl ?? "https://registry-api.tscircuit.com"

  const clonedReports = new Map<string, ClonedBugReport>()
  let browserTestResult: RunBrowserTestWithStepsResult["browserTestResult"]

  for (const step of steps) {
    switch (step.stepType) {
      case "clone_bug_report": {
        const clonedReport = await executeCloneBugReportStep(
          step,
          registryApiUrl,
        )
        clonedReports.set(step.bugReportId, clonedReport)
        break
      }
      case "run_browser_test": {
        browserTestResult = await executeRunBrowserTestStep(step, clonedReports)
        break
      }
      default: {
        // @ts-expect-error - exhaustive check
        throw new Error(`Unknown step type: ${step.stepType}`)
      }
    }
  }

  return {
    clonedReports,
    browserTestResult,
  }
}
