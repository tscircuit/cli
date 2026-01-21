import type { Command } from "commander"
import { type CliConfig, cliConfig } from "lib/cli-config"
import {
  loadProjectConfig,
  saveProjectConfig,
  CONFIG_FILENAME,
  type TscircuitProjectConfig,
} from "lib/project-config"
import kleur from "kleur"

// Keys for global CLI config
const availableGlobalConfigKeys = [
  "alwaysCloneWithAuthorName",
] satisfies (keyof CliConfig)[]

// Keys for project-specific tscircuit.config.json
const availableProjectConfigKeys = [
  "mainEntrypoint",
  "kicadLibraryEntrypointPath",
  "kicadLibraryName",
  "previewComponentPath",
  "siteDefaultComponentPath",
  "prebuildCommand",
  "buildCommand",
] satisfies (keyof TscircuitProjectConfig)[]

export const registerConfigSet = (program: Command) => {
  const configCommand = program.commands.find((c) => c.name() === "config")!

  configCommand
    .command("set")
    .description("Set a configuration value (global or project-specific)")
    .argument(
      "<key>",
      "Configuration key (e.g., alwaysCloneWithAuthorName, mainEntrypoint, kicadLibraryEntrypointPath, kicadLibraryName, previewComponentPath, siteDefaultComponentPath, prebuildCommand, buildCommand)",
    )
    .argument("<value>", "Value to set")
    .action((key: string, value: string) => {
      if (availableGlobalConfigKeys.some((k) => k === key)) {
        if (key === "alwaysCloneWithAuthorName") {
          const booleanValue = value.toLowerCase() === "true"
          cliConfig.set(key, booleanValue)
          console.log(
            kleur.cyan(
              `Set global CLI config ${kleur.yellow(key)} to ${kleur.yellow(booleanValue.toString())} successfully.`,
            ),
          )
        }
      } else if (availableProjectConfigKeys.some((k) => k === key)) {
        const projectDir = process.cwd()
        if (
          key === "mainEntrypoint" ||
          key === "kicadLibraryEntrypointPath" ||
          key === "kicadLibraryName" ||
          key === "previewComponentPath" ||
          key === "siteDefaultComponentPath" ||
          key === "prebuildCommand" ||
          key === "buildCommand"
        ) {
          const projectConfig = loadProjectConfig(projectDir) ?? {}
          projectConfig[key] = value
          if (saveProjectConfig(projectConfig, projectDir)) {
            console.log(
              kleur.cyan(
                `Set project config ${kleur.yellow(key)} to ${kleur.yellow(value)} successfully in ${kleur.bold(CONFIG_FILENAME)}.`,
              ),
            )
          } else {
            console.error(
              kleur.red(
                `Failed to set project config ${key} in ${CONFIG_FILENAME}.`,
              ),
            )
            process.exit(1)
          }
        }
      } else {
        console.error(kleur.red(`Unknown configuration key: '${key}'`))
        console.log(
          kleur.cyan(
            `Available global keys: ${availableGlobalConfigKeys.join(", ")}`,
          ),
        )
        console.log(
          kleur.cyan(
            `Available project keys: ${availableProjectConfigKeys.join(", ")}`,
          ),
        )
        process.exit(1)
      }
    })
}
