import type { Command } from "commander"
import { cliConfig } from "lib/cli-config"
import delay from "delay"
import { getKy } from "lib/registry-api/get-ky"
import { EndpointResponse } from "lib/registry-api/endpoint-types"

export const registerAuthLogin = (program: Command) => {
  program.commands
    .find((c) => c.name() === "auth")!
    .command("login")
    .description("Authenticate CLI, login to registry")
    .action(async (args) => {
      const ky = getKy()

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

      cliConfig.set("sessionToken", session.token)

      console.log("Ready to use!")
    })
}
