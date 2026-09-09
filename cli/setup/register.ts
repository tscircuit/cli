import os from "node:os"
import type { Command } from "commander"
import { setupGithubActions } from "lib/shared/setup-github-actions"
import { installTscircuitSkill } from "lib/shared/setup-tscircuit-skill"
import { prompts } from "lib/utils/prompts"

export const registerSetup = (program: Command) => {
  const setup = program
    .command("setup")
    .description("Setup utilities like GitHub Actions and AI skills")
    .action(async () => {
      const { option } = await prompts({
        type: "select",
        name: "option",
        message: "Select setup option",
        choices: [
          {
            title: "GitHub Action",
            value: "github-action",
            description:
              "Automatically build and check snapshots on push/pull-request",
            selected: true,
          },
        ],
      })

      if (option === "github-action") {
        setupGithubActions()
      }
    })

  setup
    .command("skills")
    .description("Install or update the tscircuit AI skill")
    .option(
      "--update",
      "Replace installed skills with the latest version, preserving backups",
    )
    .option("--global", "Install or update skills in your home directory")
    .action(
      async (
        options: { update?: boolean; global?: boolean },
        command: Command,
      ) => {
        try {
          await installTscircuitSkill(
            options.global ? os.homedir() : process.cwd(),
            {
              update: options.update,
            },
          )
        } catch (error) {
          command.error(error instanceof Error ? error.message : String(error))
        }
      },
    )
}
