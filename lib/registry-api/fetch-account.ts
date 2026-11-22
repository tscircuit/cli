import { cliConfig, getSessionToken } from "lib/cli-config"
import type { EndpointResponse } from "./endpoint-types"
import { getRegistryApiKy } from "./get-ky"

export type Account = EndpointResponse["accounts/get"]["account"]

export const fetchAccountOrThrow = async (): Promise<Account | null> => {
  if (process.env.TSCI_SKIP_ACCOUNT_FETCH === "true") return null

  const sessionToken = getSessionToken()
  if (!sessionToken) return null

  const ky = getRegistryApiKy({ sessionToken })
  const data = await ky
    .post<{ account?: Account | null }>("accounts/get", {
      json: {
        account_id: process.env.TSCIRCUIT_TOKEN
          ? undefined
          : cliConfig.get("accountId"),
      },
    })
    .json()

  if (
    !data ||
    typeof data !== "object" ||
    !data.account ||
    typeof data.account !== "object" ||
    Array.isArray(data.account)
  ) {
    throw new Error("Invalid account response from registry")
  }

  return data.account
}

export const fetchAccount = async (): Promise<Account | null> => {
  try {
    return await fetchAccountOrThrow()
  } catch {
    return null
  }
}
