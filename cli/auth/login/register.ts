import type { Command } from "commander"
import delay from "delay"
import { cliConfig, getSessionToken, setSessionToken } from "lib/cli-config"
import type { EndpointResponse } from "lib/registry-api/endpoint-types"
import { getRegistryApiKy } from "lib/registry-api/get-ky"

export const registerAuthLogin = (program: Command) => {
  // Define the login action once to share between both commands
  const loginAction = async () => {
    const sessionToken = getSessionToken()
    if (sessionToken) {
      const ky = getRegistryApiKy({ sessionToken })

      const accountIdFromConfig = cliConfig.get("accountId")

      let account: EndpointResponse["accounts/get"]["account"] | undefined

      if (accountIdFromConfig) {
        const tryFetchAccount = async (
          accountId: string,
        ): Promise<EndpointResponse["accounts/get"]["account"] | undefined> => {
          try {
            const { account } = await ky
              .post<EndpointResponse["accounts/get"]>("accounts/get", {
                json: { account_id: accountId },
              })
              .json()
            return account
          } catch {
            return undefined
          }
        }

        account = await tryFetchAccount(accountIdFromConfig)
      }

      const tscircuitHandle = account?.tscircuit_handle ?? "(unknown)"

      console.log(
        `Already logged in as ${tscircuitHandle}! Use 'tsci logout' if you need to switch accounts.`,
      )
      return
    }

    const ky = getRegistryApiKy()

    const { login_page } = await ky
      .post<EndpointResponse["sessions/login_page/create"]>(
        "sessions/login_page/create",
        {
          json: {},
        },
      )
      .json()

    console.log("Please visit the following URL to log in:")
    console.log(login_page.url)

    // Wait until we receive confirmation
    while (true) {
      const { login_page: new_login_page } = await ky
        .post<EndpointResponse["sessions/login_page/get"]>(
          "sessions/login_page/get",
          {
            json: {
              login_page_id: login_page.login_page_id,
            },
            headers: {
              Authorization: `Bearer ${login_page.login_page_auth_token}`,
            },
          },
        )
        .json()

      if (new_login_page.was_login_successful) {
        console.log("Logged in! Generating token...")
        break
      }

      if (new_login_page.is_expired) {
        throw new Error("Login page expired")
      }

      await delay(1000)
    }

    const { session } = await ky
      .post<EndpointResponse["sessions/login_page/exchange_for_cli_session"]>(
        "sessions/login_page/exchange_for_cli_session",
        {
          json: {
            login_page_id: login_page.login_page_id,
          },
          headers: {
            Authorization: `Bearer ${login_page.login_page_auth_token}`,
          },
        },
      )
      .json()

    setSessionToken(session.token)
    console.log("\nReady to use!")
  }

  // Register the auth login subcommand
  program.commands
    .find((c) => c.name() === "auth")!
    .command("login")
    .description("Authenticate CLI, login to registry")
    .action(loginAction)

  // Register the top-level login command as an alias
  program
    .command("login")
    .description("Login to tscircuit registry")
    .action(loginAction)
}
