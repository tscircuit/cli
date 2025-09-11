import type { Command } from "commander"
import { pushSnippet } from "lib/shared/push-snippet"

export const registerPush = (program: Command) => {
  program
    .command("push")
    .description("Save snippet code to Registry API")
    .argument("[file]", "Path to the snippet file")
    .option("--private", "Make the snippet private")
    .action(async (filePath?: string, options: { private?: boolean } = {}) => {
      await pushSnippet({
        filePath,
        isPrivate: options.private ?? false,
        onExit: (code) => process.exit(code),
        onError: (message) => console.error(message),
        onSuccess: (message) => console.log(message),
      })
    })
}
