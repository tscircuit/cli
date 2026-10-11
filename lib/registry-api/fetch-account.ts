import { cliConfig, getSessionToken } from "lib/cli-config"
import type { EndpointResponse } from "./endpoint-types"
import { getRegistryApiKy } from "./get-ky"

export type Account = EndpointResponse["accounts/get"]["account"]

/**
 * The result of an account lookup against the registry.
 *
 * - `account` is set only after a successful /accounts/get response.
 * - `error` is set only when the lookup itself failed (HTTP error, network
 *   failure, malformed response, or a session expired while making the
 *   request). The raw error is preserved so callers can surface the real
 *   cause (e.g. HTTP 503 from the registry) instead of mistaking a service
 *   outage for "you need to set a handle".
 * - Neither is set only when there is no session token to look up with.
 *
 * See issue tscircuit/cli#5275: catch-all nulls from fetchAccount caused
 * `tsci push` to report a missing tscircuit handle whenever the registry
 * was unavailable.
 */
export type FetchAccountResult =
  | { account: Account; error?: undefined }
  | { account?: undefined; error: unknown }

export const fetchAccount = async (): Promise<Account | null> => {
  const sessionToken = getSessionToken()
  if (!sessionToken) return null

  try {
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
    return account
  } catch {
    return null
  }
}

/**
 * Lookup that reports failures instead of swallowing them.
 *
 * Callers that must distinguish "account verified, no handle set" from
 * "could not verify the account" (push, whoami, login) should use this.
 * A `null` return still means "no session token": the caller's existing
 * not-logged-in handling applies.
 */
export const fetchAccountOrError = async (): Promise<FetchAccountResult> => {
  const sessionToken = getSessionToken()
  if (!sessionToken) return { account: undefined, error: undefined }

  try {
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
    return { account }
  } catch (error) {
    return { error }
  }
}
