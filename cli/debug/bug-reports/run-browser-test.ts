import { cloneBugReport } from "cli/clone/clone-bug-report"
import { DevServer } from "cli/dev/DevServer"
import type { Command } from "commander"
import getPort from "get-port"
import kleur from "kleur"
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { EventsWatcher } from "lib/server/EventsWatcher"
import { getEntrypoint } from "lib/shared/get-entrypoint"

type RunBrowserTestOptions = {
  bugReportId: string
  patch?: string
  mainComponentPath?: string
}

const WAIT_FOR_RUN_COMPLETED_TIMEOUT_MS = 60_000

const waitForRunCompleted = (eventsWatcher: EventsWatcher) =>
  new Promise<{ errors?: unknown; hasExecutionError?: boolean }>(
    (resolve, reject) => {
      const onRunCompleted = (event: {
        errors?: unknown
        hasExecutionError?: boolean
      }) => {
        clearTimeout(timeoutId)
        eventsWatcher.off("RUN_COMPLETED", onRunCompleted)
        resolve(event)
      }

      const timeoutId = globalThis.setTimeout(() => {
        eventsWatcher.off("RUN_COMPLETED", onRunCompleted)
        reject(
          new Error(
            `Timed out waiting for RUN_COMPLETED after ${WAIT_FOR_RUN_COMPLETED_TIMEOUT_MS / 1000}s`,
          ),
        )
      }, WAIT_FOR_RUN_COMPLETED_TIMEOUT_MS)

      eventsWatcher.on("RUN_COMPLETED", onRunCompleted)
    },
  )

const applyPatchFile = (patchPath: string, cwd: string) => {
  if (!fs.existsSync(patchPath)) {
    throw new Error(`Patch file not found: ${patchPath}`)
  }

  const patchResult = spawnSync(
    "git",
    ["apply", "--unsafe-paths", "--whitespace=nowarn", "--no-index", patchPath],
    {
      cwd,
      stdio: "inherit",
    },
  )

  if (patchResult.status !== 0) {
    throw new Error(`Failed to apply patch from ${patchPath}`)
  }
}

const loadChromium = () => {
  const require = createRequire(import.meta.url)

  try {
    const { chromium } = require("playwright")

    if (!chromium) {
      throw new Error("chromium export missing from playwright")
    }

    return chromium
  } catch (error) {
    throw new Error(
      `${kleur.red("Playwright is required for this command.")} Install it globally with 'npm i -g playwright'. Original error: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

const resolveMainComponentPath = async (
  projectDir: string,
  providedPath?: string,
) => {
  if (providedPath) {
    const absolutePath = path.isAbsolute(providedPath)
      ? providedPath
      : path.join(projectDir, providedPath)

    if (!fs.existsSync(absolutePath)) {
      console.error(
        kleur.red(
          `Main component path does not exist: ${path.relative(projectDir, absolutePath)}`,
        ),
      )
      return null
    }

    return absolutePath
  }

  const detectedEntrypoint = await getEntrypoint({
    projectDir,
    onError: (message) => console.error(message),
    onSuccess: (message) => console.log(message),
  })

  if (!detectedEntrypoint) {
    console.error(kleur.red("Could not determine a main component path."))
    return null
  }

  return detectedEntrypoint
}

export const registerRunBrowserTest = (bugReportCommand: Command) => {
  bugReportCommand
    .command("run-browser-test")
    .description(
      "Clone a bug report, optionally apply a patch, and run a headless browser test",
    )
    .requiredOption("--bug-report-id <bugReportId>", "Bug report ID to clone")
    .option("--patch <path>", "Path to a patch file to apply after cloning")
    .option(
      "--main-component-path <path>",
      "Path to the main component to load (relative to the cloned bug report)",
    )
    .action(async (options: RunBrowserTestOptions) => {
      const originalCwd = process.cwd()
      let bugReportDir = ""
      let devServer: DevServer | undefined
      let browser: any

      try {
        bugReportDir = await cloneBugReport({
          bugReportId: options.bugReportId,
          originalCwd,
        })

        if (options.patch) {
          const patchPath = path.resolve(originalCwd, options.patch)
          console.log(kleur.gray(`Applying patch from ${patchPath}...`))
          applyPatchFile(patchPath, bugReportDir)
          console.log(kleur.green("Patch applied successfully."))
        }

        process.chdir(bugReportDir)

        const mainComponentPath = await resolveMainComponentPath(
          bugReportDir,
          options.mainComponentPath,
        )

        if (!mainComponentPath) {
          process.exitCode = 1
          return
        }

        const port = await getPort({ port: 3020 })
        devServer = new DevServer({
          port,
          componentFilePath: mainComponentPath,
          projectDir: bugReportDir,
        })

        await devServer.start()

        const eventsWatcher =
          devServer.eventsWatcher ??
          new EventsWatcher(`http://localhost:${port}`)
        if (!devServer.eventsWatcher) {
          await eventsWatcher.start()
        }

        const runCompletedPromise = waitForRunCompleted(eventsWatcher)

        const chromium = loadChromium()
        browser = await chromium.launch({ headless: true })
        const page = await browser.newPage()
        await page.goto(`http://localhost:${port}`)
        console.log(kleur.gray(`Opened http://localhost:${port} in Playwright`))

        const runCompletedEvent = await runCompletedPromise
        console.log(
          kleur.green("RUN_COMPLETED event received from file server."),
        )

        if (
          Array.isArray(runCompletedEvent?.errors) &&
          runCompletedEvent.errors.length > 0
        ) {
          console.log(kleur.yellow("Errors:"), runCompletedEvent.errors)
        }

        if (runCompletedEvent?.hasExecutionError) {
          console.error(
            kleur.red("Execution error detected during browser test."),
          )
          process.exitCode = 1
        }
      } catch (error) {
        console.error(kleur.red("Failed to run browser test:"))
        console.error(error)
        process.exitCode = 1
      } finally {
        await browser?.close?.()
        await devServer?.stop()
        process.chdir(originalCwd)
      }

      if (process.exitCode && process.exitCode !== 0) {
        process.exit(process.exitCode)
      }
    })
}
