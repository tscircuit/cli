import { cliConfig, getSessionToken } from "lib/cli-config"
import type { EndpointResponse } from "./endpoint-types"
import { getRegistryApiKy } from "./get-ky"

export type Account = EndpointResponse["accounts/get"]["account"]

export const fetchAccount = async ({
  throwOnError = false,
}: {
  throwOnError?: boolean
} = {}): Promise<Account | null> => {
  const sessionToken = getSessionToken()
  if (!sessionToken) return null

  try {
    const ky = getRegistryApiKy({ sessionToken })
    const response = await ky
      .post<EndpointResponse["accounts/get"]>("accounts/get", {
        json: {
          account_id: process.env.TSCIRCUIT_TOKEN
            ? undefined
            : cliConfig.get("accountId"),
        },
      })
      .json()
    if (
      !response ||
      typeof response !== "object" ||
      !response.account ||
      typeof response.account !== "object"
    ) {
      throw new Error(
        "Invalid response from registry /accounts/get: missing account object",
      )
    }
    return response.account
  } catch (error) {
    if (throwOnError) {
      throw error
    }
    return null
  }
}
