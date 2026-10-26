import { cliConfig, getSessionToken } from "lib/cli-config"
import { getRegistryApiKy } from "./get-ky"
import type { EndpointResponse } from "./endpoint-types"

export type Account = EndpointResponse["accounts/get"]["account"]

export const fetchAccount = async (): Promise<Account | null> => {
  let response: EndpointResponse["accounts/get"]
  try {
    const sessionToken = getSessionToken()
    if (!sessionToken) return null

    const ky = getRegistryApiKy({ sessionToken })
    response = await ky
      .post<EndpointResponse["accounts/get"]>("accounts/get", {
        json: {
          account_id: process.env.TSCIRCUIT_TOKEN
            ? undefined
            : cliConfig.get("accountId"),
        },
      })
      .json()
  } catch (error) {
    let status: unknown
    let isInvalidJson = false
    try {
      status = (error as { response?: { status?: unknown } })?.response?.status
      isInvalidJson = error instanceof SyntaxError
    } catch {
      // Getters and proxies can throw even while inspecting an error.
      status = undefined
    }
    const httpStatus =
      typeof status === "number" &&
      Number.isInteger(status) &&
      status >= 400 &&
      status <= 599
        ? status
        : undefined
    // Registry errors can include request/response bodies. Do not expose them,
    // token-bearing URLs, or the original error as a cause in this message.
    const detail = httpStatus
      ? `registry returned HTTP ${httpStatus}.`
      : isInvalidJson
        ? "registry returned invalid JSON."
        : "the registry request failed. Check your connection and try again."
    const authAdvice =
      httpStatus === 401
        ? " Check TSCIRCUIT_TOKEN or run `tsci logout`, then `tsci login` to authenticate again."
        : ""
    throw new Error(`Could not retrieve your account: ${detail}${authAdvice}`)
  }

  const account = response?.account
  if (!account || typeof account !== "object" || Array.isArray(account)) {
    throw new Error(
      "Could not retrieve your account: registry returned an invalid account response.",
    )
  }
  return account
}
