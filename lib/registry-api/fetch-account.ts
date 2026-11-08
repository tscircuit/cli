import { cliConfig, getSessionToken } from "lib/cli-config"
import { getRegistryApiKy } from "./get-ky"
import type { EndpointResponse } from "./endpoint-types"

export type Account = EndpointResponse["accounts/get"]["account"]

export const fetchAccount = async (options?: {
  throwOnError?: boolean
}): Promise<Account | null> => {
  if (process.env.TSCI_SKIP_ACCOUNT_FETCH === "true") return null

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
    const account = response?.account
    if (!account || typeof account !== "object" || Array.isArray(account)) {
      throw new Error("Invalid account response from registry")
    }
    return account
  } catch (error) {
    if (options?.throwOnError) {
      throw error
    }
    return null
  }
}
