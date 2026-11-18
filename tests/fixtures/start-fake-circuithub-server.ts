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
export const startFakeCircuithubServer = async ({
  token = "test-circuithub-token",
}: { token?: string } = {}) => {
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
      if (req.headers.get("authorization") !== `Bearer ${token}`) {
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
        case "POST /v1/projects": {
          // Like api.circuithub.com, which takes the classification as an
          // object such as {"tag": "EAR99"} and refuses a bare string.
          const { exportClassification } = JSON.parse(text)
          if (
            typeof exportClassification !== "object" ||
            typeof exportClassification?.tag !== "string"
          ) {
            return new Response(
              "Error in $.exportClassification: parsing ExportClassificationStatement failed, expected Object, but encountered String",
              { status: 400 },
            )
          }
          return json({
            projectId: 9001,
            revisionId: 77,
            statusUrl: "/v1/projects/9001/status",
          })
        }
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
          // Like CircuitHub: the CAM report flag turns true before the
          // board is measured; the real values arrive in a later version.
          const measured = boardReads >= 2
          return json({
            boardId: 1,
            version: measured ? 4 : 3,
            hasCamReport: true,
            messages: measured
              ? []
              : [
                  {
                    level: "Error",
                    message: "Minimum trace gap cannot be less than 0.0899mm",
                  },
                ],
            spec: {
              widthMM: measured ? 20 : 20.1,
              lengthMM: measured ? 20 : 20.1,
              numLayers: 2,
              minTraceWidthMM: 0.15,
              minPitchMM: measured ? 0.15 : 0,
              minHoleSizeMM: measured ? 0.3 : null,
            },
          })
        }
        case "GET /v1/projects/9001/bom":
          return json({
            revisionId: 77,
            summary: {
              total: 3,
              resolved: 1,
              unresolved: 1,
              errored: 0,
              notFitted: 1,
            },
            // Current response shape: references live in `placements`,
            // and do-not-place lines are `not_fitted`.
            bomLines: [
              {
                id: 501,
                status: "resolved",
                quantity: 2,
                placements: [
                  { ref: "R1", dnp: false, side: "top" },
                  { ref: "R2", dnp: false, side: "top" },
                ],
              },
              {
                id: 502,
                status: "unresolved",
                quantity: 1,
                placements: [{ ref: "C1", dnp: false, side: "top" }],
              },
              {
                id: 503,
                status: "not_fitted",
                quantity: 0,
                placements: [{ ref: "H1", dnp: true, side: "top" }],
              },
            ],
          })
        case "POST /v1/quotes": {
          const { revisionId, quantity } = JSON.parse(text)
          const boards = 40 + quantity * 2
          // Like CircuitHub: before the board is measured (trace gap 0),
          // Grid Proto is refused and the quote says why.
          const measured = boardReads >= 2
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
            designFeedback: measured
              ? []
              : [
                  {
                    type: "grid_proto",
                    summary: "This design doesn't qualify for Grid Proto.",
                    reasons: [
                      "Minimum trace gap cannot be less than 0.127mm; this board's minimum trace gap is 0mm.",
                    ],
                  },
                ],
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
                  discounts: measured
                    ? [
                        {
                          type: "grid_proto",
                          label: "Grid Proto",
                          amount: "30.00",
                        },
                      ]
                    : [],
                  excludes: ["shipping", "tax"],
                  manufacturingSubtotal: (boards + 103).toFixed(2),
                  manufacturingTotal: (boards + (measured ? 73 : 103)).toFixed(
                    2,
                  ),
                  manufacturingUnitPrice: (
                    (boards + (measured ? 73 : 103)) /
                    quantity
                  ).toFixed(2),
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
