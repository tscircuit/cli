const originalFetch = globalThis.fetch
const skillApiUrl = "https://api.github.com/repos/tscircuit/skill/contents"
const skillDownloadUrl =
  "https://raw.githubusercontent.com/tscircuit/skill/main"

globalThis.fetch = Object.assign(async (...args: Parameters<typeof fetch>) => {
  let url = String(args[0])
  if (args[0] instanceof Request) {
    url = args[0].url
  }

  switch (url) {
    case skillApiUrl:
      return Response.json([
        {
          name: "SKILL.md",
          path: "SKILL.md",
          type: "file",
          download_url: `${skillDownloadUrl}/SKILL.md`,
        },
        {
          name: "references",
          path: "references",
          type: "dir",
          download_url: null,
        },
      ])
    case `${skillApiUrl}/references`:
      return Response.json([
        {
          name: "example.md",
          path: "references/example.md",
          type: "file",
          download_url: `${skillDownloadUrl}/references/example.md`,
        },
      ])
    case `${skillDownloadUrl}/SKILL.md`:
      return new Response("# Test tscircuit skill\n")
    case `${skillDownloadUrl}/references/example.md`:
      return new Response("# Test circuit example\n")
  }

  return originalFetch(...args)
}, originalFetch)
