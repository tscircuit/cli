import type { Command } from "commander"
import { prompts } from "lib/utils/prompts"
import { setupGithubActions } from "lib/shared/setup-github-actions"

export const registerSetup = (program: Command) => {
  program
    .command("setup")
    .description("Setup utilities like GitHub Actions")
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
              "Automatically build, check and commit snapshots to the main branch",
            selected: true,
          },
        ],
      })

      if (option === "github-action") {
        setupGithubActions()
      }
    })
}
