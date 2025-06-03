import { getRegistryApiUrl } from "lib/cli-config"
import ky, { type AfterResponseHook } from "ky"

export const prettyResponseErrorHook: AfterResponseHook = async (
  _request,
  _options,
  response,
) => {
  if (!response.ok) {
    try {
      const errorData = (await response.json()) as any

      let requestBody = ""
      try {
        requestBody = await _request.clone().text()
      } catch {
        // ignore errors cloning request body
      }

      const apiError = errorData?.error
      const errorString = apiError
        ? `\n${apiError.error_code}: ${apiError.message}`
        : ""

      throw new Error(
        `FAIL [${response.status}]: ${_request.method} ${
          new URL(_request.url).pathname
        }` +
          errorString +
          (requestBody ? `\n\nRequest Body:\n${requestBody}` : "") +
          `\n\n${JSON.stringify(errorData, null, 2)}`,
      )
    } catch (e) {
      //ignore, allow the error to be thrown
    }
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
