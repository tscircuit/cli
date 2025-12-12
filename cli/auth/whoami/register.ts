import type { Command } from "commander"
import { cliConfig, getSessionToken } from "lib/cli-config"
import { fetchAccount } from "lib/registry-api/fetch-account"
import kleur from "kleur"

const formatDate = (date: string | undefined): string | null => {
  if (!date) return null
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const registerAuthWhoami = (program: Command) => {
  program.commands
    .find((c) => c.name() === "auth")!
    .command("whoami")
    .description("Show information about the current authenticated user")
    .action(async () => {
      if (!getSessionToken()) {
        console.log(kleur.yellow("You need to log in to access this."))
        return
      }

      const account = await fetchAccount()

      console.log(kleur.bold().green("\nLogged in user:\n"))
      console.log(
        `  ${kleur.cyan("TscHandle:")}    @${kleur.white(account?.tscircuit_handle ?? kleur.dim("(not set)"))}`,
      )
      console.log(
        `  ${kleur.cyan("Account ID:")}   ${kleur.white(account?.account_id ?? cliConfig.get("accountId") ?? kleur.dim("(unknown)"))}`,
      )
      console.log(
        `  ${kleur.cyan("Email:")}        ${kleur.white(account?.email ?? kleur.dim("(unknown)"))}`,
      )
      console.log(
        `  ${kleur.cyan("Session ID:")}   ${kleur.white(cliConfig.get("sessionId") ?? kleur.dim("(unknown)"))}`,
      )
      console.log(
        `  ${kleur.cyan("Personal Org:")} ${kleur.white(account?.personal_org_id ?? kleur.dim("(unknown)"))}`,
      )
      const createdAt = formatDate(account?.created_at)
      console.log(
        `  ${kleur.cyan("Created:")}      ${createdAt ? kleur.white(createdAt) : kleur.dim("(unknown)")}`,
      )
      console.log()
    })
}
