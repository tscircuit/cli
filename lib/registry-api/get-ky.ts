import ky, { type AfterResponseHook, type KyResponse } from "ky"
import { getRegistryApiUrl, getSessionToken } from "lib/cli-config"
import { getSessionTokenFromNpmrc } from "lib/cli-config"
import { getPlatformFetch } from "lib/shared/get-platform-fetch"

const MAX_ERROR_BODY_LENGTH = 1024
const uploadContentFields = new Set([
  "archive_base64",
  "content_base64",
  "content_text",
])

const truncateErrorText = (text: string) =>
  text.length > MAX_ERROR_BODY_LENGTH
    ? `${text.slice(0, MAX_ERROR_BODY_LENGTH)}\n[truncated ${text.length - MAX_ERROR_BODY_LENGTH} characters]`
    : text

const formatErrorBody = (text: string) => {
  try {
    return truncateErrorText(
      JSON.stringify(
        JSON.parse(text),
        (key, value) =>
          uploadContentFields.has(key) && typeof value === "string"
            ? `[omitted ${value.length} characters]`
            : value,
        2,
      ),
    )
  } catch {
    return truncateErrorText(text)
  }
}

class PrettyHttpError extends Error {
  constructor(
    message: string,
    public request: Request,
    public response: KyResponse<unknown>,
  ) {
    super(message)
  }

  get status() {
    return this.response.status
  }

  get url() {
    return this.response.url
  }

  get method() {
    return this.request.method
  }

  get pathname() {
    return new URL(this.response.url).pathname
  }
}

export const prettyResponseErrorHook: AfterResponseHook = async (
  request,
  _options,
  response,
) => {
  if (!response.ok) {
    let errorData: any = null
    let responseText = ""
    try {
      responseText = await response.clone().text()
      errorData = JSON.parse(responseText)
    } catch {}

    let requestBody = ""
    try {
      requestBody = formatErrorBody(await request.clone().text())
    } catch {}

    const apiError = errorData?.error
    const errorString = apiError
      ? `\n${truncateErrorText(`${apiError.error_code}: ${apiError.message}`)}`
      : ""
    const sessionExpiredAdvice =
      request.headers.has("Authorization") &&
      /session_expired|token_expired|expired_session/i.test(
        apiError?.error_code ?? "",
      )
        ? "\n\nYour tscircuit session has expired. Run `tsci logout`, then `tsci login` to log back in."
        : ""

    const bodyDisplay = errorData
      ? formatErrorBody(responseText)
      : responseText.slice(0, 20)

    throw new PrettyHttpError(
      `FAIL [${response.status}]: ${request.method} ${
        new URL(request.url).pathname
      }${errorString}${sessionExpiredAdvice}${requestBody ? `\n\nRequest Body:\n${requestBody}` : ""}\n\n${bodyDisplay}`,
      request,
      response,
    )
  }
}

export const getRegistryApiKy = ({
  sessionToken,
}: {
  sessionToken?: string
} = {}) => {
  const resolvedToken =
    sessionToken ?? getSessionToken() ?? getSessionTokenFromNpmrc()
  return ky.create({
    fetch: getPlatformFetch(),
    prefixUrl: getRegistryApiUrl(),
    headers: {
      ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
    },
    hooks: {
      afterResponse: [prettyResponseErrorHook],
    },
  })
}
