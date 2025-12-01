import type { Command } from "commander"
import { pushSnippet } from "lib/shared/push-snippet"

export const registerPush = (program: Command) => {
  program
    .command("push")
    .description("Save package code to Registry API")
    .argument("[file]", "Path to the package file")
    .option("--private", "Make the package private")
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
          onError: (message) => console.error(`Error while pushing ${filePath }: ${message}`),
          onSuccess: (message) => console.log(message),
        })
      },
    )
}
