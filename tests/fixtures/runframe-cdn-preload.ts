const originalFetch = globalThis.fetch

globalThis.fetch = Object.assign(
  (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input)
    if (url === "https://registry.npmjs.org/@tscircuit/runframe/latest") {
      return Promise.resolve(Response.json({ version: "0.0.9999" }))
    }
    return originalFetch(input, init)
  },
  originalFetch,
)
