export class BakedAssetNotFoundError extends Error {
  constructor() {
    super(
      "This part isn't currently available in tscircuit standalone (enterprise), please contact your representative to get it added",
    )
  }
}

export const getPlatformFetch = (
  upstreamFetch: typeof fetch = globalThis.fetch,
): typeof fetch => {
  const baseUrl = process.env.TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL?.replace(
    /\/+$/,
    "",
  )
  if (!baseUrl) return upstreamFetch
  const origin = new URL(baseUrl).origin

  return Object.assign(
    async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : input)
      if (url.protocol !== "http:" && url.protocol !== "https:")
        return upstreamFetch(input, init)
      const target =
        url.origin === origin
          ? url
          : new URL(
              `${url.hostname}${url.pathname}${url.search}`,
              `${baseUrl}/`,
            )
      const response = await upstreamFetch(
        new Request(target, new Request(input, init)),
      )
      if (response.status === 404 || response.status === 405)
        throw new BakedAssetNotFoundError()
      return response
    },
    { preconnect: upstreamFetch.preconnect },
  )
}
