import { pushSnippet } from "lib/shared/push-snippet"
import type { Command } from "commander"

export const registerPush = (program: Command) => {
  program
    .command("push")
    .description("Save snippet code to Registry API")
    .argument("[file]", "Path to the snippet file")
    .action(async (filePath?: string) => {
      await pushSnippet({
        filePath,
        onExit: (code) => process.exit(code),
        onError: (message) => console.error(message),
        onSuccess: (message) => console.log(message),
      })
    })
}
