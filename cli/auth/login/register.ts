import type { Command } from "commander"
import { setSessionToken, getSessionToken, cliConfig } from "lib/cli-config"
import delay from "delay"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import type { EndpointResponse } from "lib/registry-api/endpoint-types"
import { fetchAccountResult } from "lib/registry-api/fetch-account"
import kleur from "kleur"
import { setupNpmrc } from "../setup-npmrc/setup-npmrc"

export const registerAuthLogin = (program: Command) => {
  // Define the login action once to share between both commands
  const loginAction = async () => {
    const sessionToken = getSessionToken()
    const tscircuitHandle = cliConfig.get("tscircuitHandle")
    if (sessionToken) {
      const accountResult = await fetchAccountResult()
      if (accountResult.status === "error") {
        console.error(
          kleur.red(
            `Could not verify existing login session: ${accountResult.message}`,
          ),
        )
        process.exit(1)
      }

      const account =
        accountResult.status === "ok" ? accountResult.account : null
      const savedHandle = process.env.TSCIRCUIT_TOKEN
        ? undefined
        : tscircuitHandle
      const displayIdentity =
        savedHandle ?? account?.tscircuit_handle ?? account?.account_id
      const formattedIdentity = savedHandle
        ? kleur.bold(`@${savedHandle}`)
        : displayIdentity
          ? kleur.underline(`@${displayIdentity}`)
          : "an existing account (handle not set)"

      console.log(
        kleur.yellow(
          `Already logged in as ${formattedIdentity}! Use ${kleur.cyan("tsci logout")} to switch accounts.`,
        ),
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

    // Setup npmrc with the new session token in global level ~/.npmrc file
    setupNpmrc(session.token)
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
