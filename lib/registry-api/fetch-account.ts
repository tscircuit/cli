import { cliConfig, getSessionToken } from "lib/cli-config"
import type { EndpointResponse } from "./endpoint-types"
import { getRegistryApiKy } from "./get-ky"

export type Account = EndpointResponse["accounts/get"]["account"]

export class AccountLookupError extends Error {
  constructor(
    message: string,
    public readonly options?: {
      cause?: unknown
      status?: number
    },
  ) {
    super(
      message,
      options?.cause !== undefined ? { cause: options.cause } : undefined,
    )
    this.name = "AccountLookupError"
  }

  get status(): number | undefined {
    return this.options?.status
  }
}

const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined
  if ("status" in error && typeof error.status === "number") {
    return error.status
  }
  if (
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "status" in error.response &&
    typeof error.response.status === "number"
  ) {
    return error.response.status
  }
  return undefined
}

export const toAccountLookupError = (error: unknown): AccountLookupError => {
  if (error instanceof AccountLookupError) return error

  const status = getErrorStatus(error)
  if (status !== undefined) {
    const detail = error instanceof Error ? error.message : String(error)
    return new AccountLookupError(
      `registry returned HTTP ${status}.\n${detail}`,
      {
        cause: error,
        status,
      },
    )
  }

  if (error instanceof SyntaxError) {
    return new AccountLookupError(
      `registry returned malformed JSON (${error.message}).`,
      { cause: error },
    )
  }

  if (error instanceof Error) {
    const baseMessage = error.message || "request failed"
    const causeMessage =
      error.cause instanceof Error &&
      error.cause.message &&
      !baseMessage.includes(error.cause.message)
        ? ` (${error.cause.message})`
        : ""
    return new AccountLookupError(`${baseMessage}${causeMessage}`, {
      cause: error,
    })
  }

  return new AccountLookupError(String(error), { cause: error })
}

export const formatAccountLookupError = (
  context: string,
  error: unknown,
): string => {
  const lookupError = toAccountLookupError(error)
  const retryHint =
    lookupError.status !== undefined &&
    (lookupError.status >= 500 || lookupError.status === 429)
      ? "\nRetry when the registry is available."
      : ""
  return `${context}: ${lookupError.message}${retryHint}`
}

export const fetchAccount = async (): Promise<Account | null> => {
  if (process.env.TSCI_SKIP_ACCOUNT_FETCH === "true") return null

  const sessionToken = getSessionToken()
  if (!sessionToken) return null

  let data: unknown
  try {
    const ky = getRegistryApiKy({ sessionToken })
    data = await ky
      .post<EndpointResponse["accounts/get"]>("accounts/get", {
        json: {
          account_id: process.env.TSCIRCUIT_TOKEN
            ? undefined
            : cliConfig.get("accountId"),
        },
      })
      .json()
  } catch (error) {
    throw toAccountLookupError(error)
  }

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !("account" in data) ||
    !data.account ||
    typeof data.account !== "object" ||
    Array.isArray(data.account)
  ) {
    throw new AccountLookupError(
      "registry returned an invalid account response (missing account object).",
    )
  }

  return (data as EndpointResponse["accounts/get"]).account
}
