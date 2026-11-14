const originalFetch = globalThis.fetch
const contentsUrl = "https://api.github.com/repos/tscircuit/skill/contents"
const downloadUrl =
  "https://raw.githubusercontent.com/tscircuit/skill/test-fixture/SKILL.md"

globalThis.fetch = Object.assign(
  async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input)
    if (url === contentsUrl) {
      return Response.json([
        { name: "SKILL.md", type: "file", download_url: downloadUrl },
      ])
    }
    if (url === downloadUrl) {
      return new Response(
        await Bun.file(
          new URL("./assets/tscircuit-skill/SKILL.md", import.meta.url),
        ).text(),
      )
    }
    if (
      url.startsWith(contentsUrl) ||
      url.startsWith("https://raw.githubusercontent.com/tscircuit/skill/")
    ) {
      throw new Error(`Unexpected skill fixture request: ${url}`)
    }
    return originalFetch(input, init)
  },
  { preconnect: originalFetch.preconnect },
)
