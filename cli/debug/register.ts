import type { Command } from "commander"
import { registerDebugBugReports } from "./bug-reports/register"

export const registerDebug = (program: Command) => {
  const debugCommand = program.command("debug").description("Debug utilities")

  registerDebugBugReports(debugCommand)
}
