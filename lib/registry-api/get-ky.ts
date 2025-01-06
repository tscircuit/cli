import { getRegistryApiUrl } from "lib/cli-config"
import ky, { type AfterResponseHook } from "ky"

const prettyResponseErrorHook: AfterResponseHook = async (
  _request,
  _options,
  response,
) => {
  if (!response.ok) {
    try {
      const errorData = await response.json()
      throw new Error(
        `FAIL [${response.status}]: ${_request.method} ${
          new URL(_request.url).pathname
        } \n\n ${JSON.stringify(errorData, null, 2)}`,
      )
    } catch (e) {
      //ignore, allow the error to be thrown
    }
  }
}

export const getKy = () => {
  return ky.create({
    prefixUrl: getRegistryApiUrl(),
    hooks: {
      afterResponse: [prettyResponseErrorHook],
    },
  })
}
