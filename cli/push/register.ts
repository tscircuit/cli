import type { Command } from "commander"
import { pushSnippet } from "lib/shared/push-snippet"

export const registerPush = (program: Command) => {
  program
    .command("push")
    .description("Save snippet code to Registry API")
    .argument("[file]", "Path to the snippet file")
    .option("--private", "Make the snippet private")
    .option(
      "--version-tag <tag>",
      "Publish as a non-latest version using the provided tag",
    )
    .action(
      async (
        filePath?: string,
        options: { private?: boolean; versionTag?: string } = {},
      ) => {
        await pushSnippet({
          filePath,
          isPrivate: options.private ?? false,
          versionTag: options.versionTag,
          onExit: (code) => process.exit(code),
          onError: (message) => console.error(message),
          onSuccess: (message) => console.log(message),
        })
      },
    )
}
