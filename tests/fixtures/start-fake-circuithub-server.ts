import getPort from "get-port"

export interface FakeCircuithubRequest {
  method: string
  path: string
  authorization: string | null
  body: any
}

/**
 * A stand-in for api.circuithub.com that walks a project through import and
 * CAM analysis and answers quote requests with recorded-shape responses.
 * The CAM report is only "ready" on the second board read, so the CLI has
 * to wait for it.
 */
export const startFakeCircuithubServer = async () => {
  const port = await getPort()
  const baseUrl = `http://localhost:${port}`
  const requests: FakeCircuithubRequest[] = []
  const uploads = new Map<string, string>()
  let boardReads = 0

  const json = (body: unknown, status = 200) => Response.json(body, { status })

  const server = Bun.serve({
    port,
    fetch: async (req) => {
      const url = new URL(req.url)
      const text = req.method === "GET" ? "" : await req.text()
      if (url.pathname.startsWith("/s3/")) {
        uploads.set(decodeURIComponent(url.pathname.slice(4)), text)
        return new Response(null, { status: 200 })
      }
      requests.push({
        method: req.method,
        path: `${url.pathname}${url.search}`,
        authorization: req.headers.get("authorization"),
        body: text ? JSON.parse(text) : null,
      })
      if (req.headers.get("authorization") !== "Bearer test-circuithub-token") {
        return json({ error: { message: "Invalid token" } }, 401)
      }
      const route = `${req.method} ${url.pathname}`
      switch (route) {
        case "POST /v1/projects/upload-urls": {
          const { files } = JSON.parse(text)
          return json({
            uploads: files.map((file: { filename: string }) => ({
              filename: file.filename,
              uploadUrl: `${baseUrl}/s3/${encodeURIComponent(file.filename)}`,
              objectKey: `project-upload/1/${file.filename}`,
              validTill: "2026-11-14T12:00:00Z",
              headers: [["Content-Type", "application/octet-stream"]],
            })),
          })
        }
        case "GET /v1/parts": {
          const query = url.searchParams.get("q")
          if (query === "RC0402FR-071KL") {
            return json({
              query,
              exactMatches: [
                {
                  id: 1,
                  mpn: "RC0402FR-071KL",
                  manufacturer: "Yageo Corp",
                  available: 0,
                  moq: null,
                },
                {
                  id: 2,
                  mpn: "RC0402FR-071KL",
                  manufacturer: "YAGEO",
                  available: 250000,
                  moq: 1,
                },
              ],
              inexactMatches: [],
            })
          }
          return json({ query, exactMatches: [], inexactMatches: [] })
        }
        case "POST /v1/projects":
          return json({
            projectId: 9001,
            revisionId: 77,
            statusUrl: "/v1/projects/9001/status",
          })
        case "POST /v1/projects/9001/revisions":
          return json({
            projectId: 9001,
            revisionId: 78,
            statusUrl: "/v1/projects/9001/status",
          })
        case "GET /v1/projects/9001/status":
          return json({ status: "complete" })
        case "GET /v1/revisions/77/board":
        case "GET /v1/revisions/78/board": {
          boardReads++
          return json({
            boardId: 1,
            hasCamReport: boardReads >= 2,
            messages: [],
            spec: {
              widthMM: 20,
              lengthMM: 20,
              numLayers: 2,
              minTraceWidthMM: 0.15,
              minPitchMM: 0.15,
              minHoleSizeMM: 0.3,
            },
          })
        }
        case "GET /v1/projects/9001/bom":
          return json({
            revisionId: 77,
            summary: { total: 2, resolved: 1, unresolved: 1, errored: 0 },
            bomLines: [
              {
                id: 501,
                referenceDesignators: ["R1", "R2"],
                status: "resolved",
                resolvedManufacturer: "YAGEO",
                resolvedPartMpn: "RC0402FR-071KL",
              },
              {
                id: 502,
                referenceDesignators: ["C1"],
                status: "unresolved",
              },
            ],
          })
        case "POST /v1/quotes": {
          const { revisionId, quantity } = JSON.parse(text)
          const boards = 40 + quantity * 2
          return json({
            id: 3000 + quantity,
            status: "ready",
            type: "assembled",
            quantity,
            currency: "USD",
            orderable: false,
            expiresAt: "2026-11-14T13:00:00Z",
            projectId: 9001,
            revisionId,
            blockers: [{ code: "part_not_chosen", bomLineIds: [502] }],
            designFeedback: [],
            offers: [
              {
                id: 1,
                service: "priority",
                fabricationCountry: "US",
                assemblyLine: "us_grid",
                checkoutUrl: `https://app.circuithub.example/order?quantity=${quantity}&offer=1`,
                shipDate: { earliest: "2026-11-18", latest: "2026-11-18" },
                price: {
                  lineItems: [
                    {
                      type: "boards",
                      label: "Boards",
                      amount: boards.toFixed(2),
                    },
                    { type: "parts", label: "Parts", amount: "3.00" },
                    { type: "assembly", label: "Assembly", amount: "100.00" },
                  ],
                  discounts: [
                    {
                      type: "grid_proto",
                      label: "Grid Proto",
                      amount: "30.00",
                    },
                  ],
                  excludes: ["shipping", "tax"],
                  manufacturingSubtotal: (boards + 103).toFixed(2),
                  manufacturingTotal: (boards + 73).toFixed(2),
                  manufacturingUnitPrice: ((boards + 73) / quantity).toFixed(2),
                },
              },
              {
                id: 2,
                service: "flexible",
                fabricationCountry: "CN",
                assemblyLine: "us_grid",
                checkoutUrl: `https://app.circuithub.example/order?quantity=${quantity}&offer=2`,
                shipDate: { earliest: "2026-11-25", latest: "2026-11-27" },
                price: {
                  lineItems: [
                    { type: "boards", label: "Boards", amount: "20.00" },
                    { type: "parts", label: "Parts", amount: "3.00" },
                    { type: "assembly", label: "Assembly", amount: "80.00" },
                  ],
                  discounts: [],
                  excludes: ["shipping", "tax"],
                  manufacturingSubtotal: "103.00",
                  manufacturingTotal: "103.00",
                  manufacturingUnitPrice: (103 / quantity).toFixed(2),
                },
              },
            ],
          })
        }
      }
      return json({ error: { message: `No route for ${route}` } }, 404)
    },
  })

  globalThis.deferredCleanupFns.push(async () => {
    server.stop(true)
  })

  return { apiUrl: `${baseUrl}/v1`, requests, uploads }
}
