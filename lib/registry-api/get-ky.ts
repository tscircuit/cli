import { getRegistryApiUrl, getSessionToken } from "lib/cli-config"
import ky, { type AfterResponseHook, type KyResponse } from "ky"
import { getSessionTokenFromNpmrc } from "lib/cli-config"

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
      requestBody = await request.clone().text()
    } catch {}

    const apiError = errorData?.error
    const errorString = apiError
      ? `\n${apiError.error_code}: ${apiError.message}`
      : ""

    const bodyDisplay = errorData
      ? JSON.stringify(errorData, null, 2)
      : responseText.slice(0, 20)

    throw new PrettyHttpError(
      `FAIL [${response.status}]: ${request.method} ${
        new URL(request.url).pathname
      }${errorString}${requestBody ? `\n\nRequest Body:\n${requestBody}` : ""}\n\n${bodyDisplay}`,
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
    prefixUrl: getRegistryApiUrl(),
    headers: {
      ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
    },
    hooks: {
      afterResponse: [prettyResponseErrorHook],
    },
  })
}
