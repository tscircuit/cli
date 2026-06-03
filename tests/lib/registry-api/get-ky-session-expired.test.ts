import { expect, test } from "bun:test"
import getPort from "get-port"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import { cliConfig } from "lib/cli-config"

test("getRegistryApiKy tells users to log out and log back in when their session is expired", async () => {
  const port = await getPort()
  const server = Bun.serve({
    port,
    fetch: () =>
      new Response(
        JSON.stringify({
          error: {
            error_code: "session_expired",
            message: "Session expired",
          },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
  })

  const previousRegistryApiUrl = cliConfig.get("registryApiUrl")
  cliConfig.set("registryApiUrl", `http://localhost:${port}`)

  try {
    let message = ""
    try {
      await getRegistryApiKy({ sessionToken: "expired-user-token" })
        .post("accounts/get", { json: { account_id: "account_123" } })
        .json()
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }

    expect(message).toContain("Your tscircuit session has expired")
    expect(message).toContain("tsci logout")
    expect(message).toContain("tsci login")
  } finally {
    if (previousRegistryApiUrl) {
      cliConfig.set("registryApiUrl", previousRegistryApiUrl)
    } else {
      cliConfig.delete("registryApiUrl")
    }
    server.stop()
  }
})
