import { getRegistryApiUrl } from "lib/cli-config"
import ky, { type AfterResponseHook, type KyResponse } from "ky"

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
    const errorData = (await response.json()) as any

    let requestBody = ""
    try {
      requestBody = await request.clone().text()
    } catch {
      // ignore errors cloning request body
    }

    const apiError = errorData?.error
    const errorString = apiError
      ? `\n${apiError.error_code}: ${apiError.message}`
      : ""

    throw new PrettyHttpError(
      `FAIL [${response.status}]: ${request.method} ${
        new URL(request.url).pathname
      }${errorString}${requestBody ? `\n\nRequest Body:\n${requestBody}` : ""}\n\n${JSON.stringify(errorData, null, 2)}`,
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
  return ky.create({
    prefixUrl: getRegistryApiUrl(),
    headers: {
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    },
    hooks: {
      afterResponse: [prettyResponseErrorHook],
    },
  })
}
