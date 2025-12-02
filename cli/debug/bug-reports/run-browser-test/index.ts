import { cloneBugReport } from "cli/clone/clone-bug-report"
import { DevServer } from "cli/dev/DevServer"
import type { Command } from "commander"
import getPort from "get-port"
import kleur from "kleur"
import { EventsWatcher } from "lib/server/EventsWatcher"
import { loadChromium } from "./load-chromium"
import { resolveMainComponentPath } from "./resolve-main-component-path"
import { waitForRunCompletedEvent } from "./wait-for-run-completed-event"

type RunBrowserTestOptions = {
  bugReportId: string
  mainComponentPath?: string
}

export const registerRunBrowserTest = (bugReportCommand: Command) => {
  bugReportCommand
    .command("run-browser-test")
    .description("Clone a bug report and run a headless browser test")
    .requiredOption("--bug-report-id <bugReportId>", "Bug report ID to clone")
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

        const runCompletedPromise = waitForRunCompletedEvent(eventsWatcher)

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
