import type { Command } from "commander"
import { cliConfig, getSessionToken } from "lib/cli-config"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import type { EndpointResponse } from "lib/registry-api/endpoint-types"

export const registerAuthWhoami = (program: Command) => {
  program.commands
    .find((c) => c.name() === "auth")!
    .command("whoami")
    .description("Show information about the current authenticated user")
    .action(async () => {
      const sessionToken = getSessionToken()

      if (!sessionToken) {
        console.log("You need to log in to access this.")
        return
      }

      const ky = getRegistryApiKy({ sessionToken })

      const githubUsernameFromConfig = cliConfig.get("githubUsername")
      const accountIdFromConfig = cliConfig.get("accountId")

      let account: EndpointResponse["accounts/get"]["account"] | undefined

      if (githubUsernameFromConfig && !accountIdFromConfig) {
        const tryFetchAccount = async (
          username: string,
        ): Promise<EndpointResponse["accounts/get"]["account"] | undefined> => {
          try {
            const { account } = await ky
              .post<EndpointResponse["accounts/get"]>("accounts/get", {
                json: { github_username: username },
              })
              .json()
            return account
          } catch {
            return undefined
          }
        }

        account = await tryFetchAccount(githubUsernameFromConfig)

        if (!account && process.env.TSCI_TEST_MODE === "true") {
          const sanitized = githubUsernameFromConfig.replace(
            /[^a-zA-Z0-9]/g,
            "",
          )
          if (sanitized && sanitized !== githubUsernameFromConfig) {
            account = await tryFetchAccount(sanitized)
          }
        }
      }

      const githubUsername =
        account?.github_username ?? githubUsernameFromConfig ?? "(unknown)"
      const accountId =
        account?.account_id ?? accountIdFromConfig ?? "(unknown)"

      console.log("Currently logged in user:")
      console.log(`  GitHub Username: ${githubUsername}`)
      console.log(`  Account ID: ${accountId}`)

      const sessionId = cliConfig.get("sessionId")
      console.log(`  Session ID: ${sessionId ?? "(unknown)"}`)
    })
}
