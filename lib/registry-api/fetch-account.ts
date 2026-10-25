import { cliConfig, getSessionToken } from "lib/cli-config"
import { getRegistryApiKy } from "./get-ky"
import type { EndpointResponse } from "./endpoint-types"

export type Account = EndpointResponse["accounts/get"]["account"]

/**
 * Fetches the current account, throwing if the lookup fails. Returns null
 * only when there is no session token to look up.
 */
export const fetchAccountOrThrow = async (): Promise<Account | null> => {
  const sessionToken = getSessionToken()
  if (!sessionToken) return null

  const ky = getRegistryApiKy({ sessionToken })
  const { account } = await ky
    .post<EndpointResponse["accounts/get"]>("accounts/get", {
      json: {
        account_id: process.env.TSCIRCUIT_TOKEN
          ? undefined
          : cliConfig.get("accountId"),
      },
    })
    .json()
  if (!account) throw new Error("Registry response did not include an account")
  return account
}

export const fetchAccount = async (): Promise<Account | null> => {
  try {
    return await fetchAccountOrThrow()
  } catch {
    return null
  }
}
