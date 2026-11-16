import { cliConfig, getSessionToken } from "lib/cli-config"
import { getRegistryApiKy } from "./get-ky"
import type { EndpointResponse } from "./endpoint-types"

export type Account = EndpointResponse["accounts/get"]["account"]

export type FetchAccountResult =
  | { status: "skipped" }
  | { status: "unauthenticated" }
  | { status: "ok"; account: Account }
  | { status: "error"; message: string; error: unknown }

const formatAccountLookupError = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return String(error)
}

export const fetchAccountResult = async (): Promise<FetchAccountResult> => {
  if (process.env.TSCI_SKIP_ACCOUNT_FETCH === "true") {
    return { status: "skipped" }
  }

  const sessionToken = getSessionToken()
  if (!sessionToken) {
    return { status: "unauthenticated" }
  }

  try {
    const ky = getRegistryApiKy({ sessionToken })
    const data = await ky
      .post<Partial<EndpointResponse["accounts/get"]>>("accounts/get", {
        json: {
          account_id: process.env.TSCIRCUIT_TOKEN
            ? undefined
            : cliConfig.get("accountId"),
        },
      })
      .json()

    const account =
      data &&
      typeof data === "object" &&
      data.account &&
      typeof data.account === "object"
        ? data.account
        : null

    if (!account) {
      return {
        status: "error",
        message:
          "Registry returned an invalid response without an account object.",
        error: new Error("Missing account object in accounts/get response"),
      }
    }

    return { status: "ok", account }
  } catch (error) {
    return {
      status: "error",
      message: formatAccountLookupError(error),
      error,
    }
  }
}

export const fetchAccount = async (): Promise<Account | null> => {
  const result = await fetchAccountResult()
  return result.status === "ok" ? result.account : null
}
