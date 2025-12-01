import type { Command } from "commander"
import { registerRunBrowserTest } from "./run-browser-test"

export const registerDebugBugReports = (debugCommand: Command) => {
  const bugReportsCommand = debugCommand
    .command("bug-reports")
    .description("Debug helpers for bug reports")

  registerRunBrowserTest(bugReportsCommand)
}
