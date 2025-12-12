import { cliConfig, getSessionToken } from "lib/cli-config"
import { getRegistryApiKy } from "./get-ky"
import type { EndpointResponse } from "./endpoint-types"

export type Account = EndpointResponse["accounts/get"]["account"]

export const fetchAccount = async (): Promise<Account | null> => {
  const sessionToken = getSessionToken()
  if (!sessionToken) return null

  try {
    const ky = getRegistryApiKy({ sessionToken })
    const { account } = await ky
      .post<EndpointResponse["accounts/get"]>("accounts/get", {
        json: { account_id: cliConfig.get("accountId") },
      })
      .json()
    return account
  } catch {
    return null
  }
}
