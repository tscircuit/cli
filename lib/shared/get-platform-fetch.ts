import { getPlatformBaseUrl } from "./get-platform-base-url"
import { readFileResponse } from "./read-file-response"

export class PlatformResourceNotFoundError extends Error {
  constructor() {
    super("Resource is not available from the configured platform source")
  }
}

export const getPlatformFetch = (
  upstreamFetch: typeof fetch = globalThis.fetch,
): typeof fetch => {
  const baseUrl = getPlatformBaseUrl()
  if (!baseUrl) return upstreamFetch
  const base = new URL(`${baseUrl}/`)
  const local = base.protocol === "file:"

  return Object.assign(
    async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : input)
      if (!local && url.protocol !== "http:" && url.protocol !== "https:")
        return upstreamFetch(input, init)
      const target = (
        local
          ? url.protocol === "file:"
          : url.origin === base.origin
      )
        ? url
        : new URL(`${url.hostname}${url.pathname}${url.search}`, `${baseUrl}/`)
      const request = new Request(target, new Request(input, init))
      const response = local
        ? await readFileResponse(base, request)
        : await upstreamFetch(request)
      if (response.status === 404 || response.status === 405)
        throw new PlatformResourceNotFoundError()
      return response
    },
    { preconnect: local ? () => {} : upstreamFetch.preconnect },
  )
}
