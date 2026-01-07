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
    .option("--include-dist", "Include the dist directory in the push")
    .action(
      async (
        filePath?: string,
        options: {
          private?: boolean
          versionTag?: string
          includeDist?: boolean
        } = {},
      ) => {
        await pushSnippet({
          filePath,
          isPrivate: options.private ?? false,
          versionTag: options.versionTag,
          includeDist: options.includeDist ?? false,
          onExit: (code) => process.exit(code),
          onError: (message) => console.error(message),
          onSuccess: (message) => console.log(message),
        })
      },
    )
}
