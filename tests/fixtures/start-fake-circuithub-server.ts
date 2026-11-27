import { createHash } from "node:crypto"
import getPort from "get-port"

export interface FakeCircuithubRequest {
  method: string
  path: string
  authorization: string | null
  body: any
}

export interface FakeCircuithubOauthRequest {
  method: string
  path: string
  /** The query of an authorize request, or the form of a token or revoke one. */
  params: Record<string, string>
}

/** One sign-in, as CircuitHub keeps it: its tokens change, it stays. */
interface FakeGrant {
  clientId: string
  scope: string
  revoked: boolean
  accessTokens: Map<string, number>
  refreshToken: string
  /** The refresh token just replaced, which answers once more for 30 s. */
  previousRefreshToken?: { token: string; replacedAt: number; reused: boolean }
}

/**
 * A stand-in for api.circuithub.com that walks a project through import and
 * CAM analysis and answers quote requests with recorded-shape responses.
 * The CAM report is only "ready" on the second board read, so the CLI has
 * to wait for it.
 *
 * It is also CircuitHub's OAuth server (the issuer is the server's own
 * address): the authorize page approves at once and redirects, and the
 * API accepts the access tokens it issues as well as the static `token`.
 */
export const startFakeCircuithubServer = async ({
  token = "test-circuithub-token",
  accessTokenLifetimeSeconds = 3600,
}: { token?: string; accessTokenLifetimeSeconds?: number } = {}) => {
  const port = await getPort()
  const baseUrl = `http://localhost:${port}`
  const requests: FakeCircuithubRequest[] = []
  const oauthRequests: FakeCircuithubOauthRequest[] = []
  const uploads = new Map<string, string>()
  let boardReads = 0
  let issued = 0
  const clientId = "tscircuit-cli-client"
  const codes = new Map<
    string,
    {
      challenge: string
      redirectUri: string
      resource: string
      scope: string
    }
  >()
  const grants: FakeGrant[] = []

  const json = (body: unknown, status = 200) => Response.json(body, { status })
  const oauthError = (error: string, status = 400) => json({ error }, status)

  const issueTokens = (grant: FakeGrant) => {
    issued++
    const accessToken = `cha_test_${issued}`
    grant.accessTokens.set(
      accessToken,
      Date.now() + accessTokenLifetimeSeconds * 1000,
    )
    grant.refreshToken = `chr_test_${issued}`
    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: accessTokenLifetimeSeconds,
      refresh_token: grant.refreshToken,
      scope: grant.scope,
    }
  }

  const isAuthorized = (authorization: string | null) => {
    if (authorization === `Bearer ${token}`) return true
    const accessToken = authorization?.replace(/^Bearer /, "") ?? ""
    return grants.some((grant) => {
      const expiresAt = grant.accessTokens.get(accessToken)
      return !grant.revoked && expiresAt !== undefined && expiresAt > Date.now()
    })
  }

  const handleOauth = async (req: Request, url: URL) => {
    const route = `${req.method} ${url.pathname}`
    const params: Record<string, string> =
      req.method === "GET"
        ? Object.fromEntries(url.searchParams)
        : req.headers.get("content-type")?.includes("json")
          ? await req.json()
          : Object.fromEntries(new URLSearchParams(await req.text()))
    oauthRequests.push({ method: req.method, path: url.pathname, params })
    switch (route) {
      case "GET /.well-known/oauth-authorization-server":
        return json({
          issuer: baseUrl,
          authorization_endpoint: `${baseUrl}/oauth/authorize`,
          token_endpoint: `${baseUrl}/oauth/token`,
          registration_endpoint: `${baseUrl}/oauth/register`,
          revocation_endpoint: `${baseUrl}/oauth/revoke`,
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["none"],
          scopes_supported: ["read", "design", "issues", "ordering", "billing"],
          authorization_response_iss_parameter_supported: true,
        })
      case "POST /oauth/register":
        return json({ client_id: clientId, ...params }, 201)
      case "GET /oauth/authorize": {
        // The user approves at once.
        const code = `code_${codes.size + 1}`
        codes.set(code, {
          challenge: params.code_challenge,
          redirectUri: params.redirect_uri,
          resource: params.resource,
          scope: params.scope,
        })
        const back = new URL(params.redirect_uri)
        back.search = new URLSearchParams({
          code,
          state: params.state,
          iss: baseUrl,
        }).toString()
        return Response.redirect(back.toString(), 302)
      }
      case "POST /oauth/token": {
        if (params.client_id !== clientId) return oauthError("invalid_client")
        if (params.grant_type === "authorization_code") {
          const pending = codes.get(params.code)
          codes.delete(params.code)
          const challenge = createHash("sha256")
            .update(params.code_verifier ?? "")
            .digest("base64url")
          if (
            !pending ||
            pending.challenge !== challenge ||
            pending.redirectUri !== params.redirect_uri ||
            pending.resource !== params.resource
          ) {
            return oauthError("invalid_grant")
          }
          const grant: FakeGrant = {
            clientId,
            scope: pending.scope,
            revoked: false,
            accessTokens: new Map(),
            refreshToken: "",
          }
          grants.push(grant)
          return json(issueTokens(grant))
        }
        if (params.grant_type === "refresh_token") {
          const presented = params.refresh_token
          const grant = grants.find(
            (candidate) =>
              candidate.refreshToken === presented ||
              candidate.previousRefreshToken?.token === presented,
          )
          if (!grant || grant.revoked) return oauthError("invalid_grant")
          if (grant.refreshToken !== presented) {
            // The one just replaced: once more within 30 s, then it ends
            // the sign-in, as a stolen token would be used.
            const previous = grant.previousRefreshToken!
            if (previous.reused || Date.now() - previous.replacedAt > 30_000) {
              grant.revoked = true
              return oauthError("invalid_grant")
            }
            previous.reused = true
          } else {
            grant.previousRefreshToken = {
              token: presented,
              replacedAt: Date.now(),
              reused: false,
            }
          }
          return json(issueTokens(grant))
        }
        return oauthError("unsupported_grant_type")
      }
      case "POST /oauth/revoke": {
        for (const grant of grants) {
          if (
            grant.refreshToken === params.token ||
            grant.accessTokens.has(params.token)
          ) {
            grant.revoked = true
          }
        }
        return new Response(null, { status: 200 })
      }
    }
    return undefined
  }

  const server = Bun.serve({
    port,
    fetch: async (req) => {
      const url = new URL(req.url)
      if (
        url.pathname.startsWith("/oauth/") ||
        url.pathname.startsWith("/.well-known/")
      ) {
        const response = await handleOauth(req, url)
        if (response) return response
      }
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
      if (!isAuthorized(req.headers.get("authorization"))) {
        return Response.json(
          { error: { message: "Invalid token" } },
          {
            status: 401,
            headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' },
          },
        )
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

  return {
    apiUrl: `${baseUrl}/v1`,
    /** CIRCUITHUB_LOGIN_URL for signing in to this server. */
    loginUrl: baseUrl,
    requests,
    oauthRequests,
    uploads,
    /** Whether a sign-in is still live at the server. */
    activeSignIns: () => grants.filter((grant) => !grant.revoked).length,
    /** Refuse the access tokens issued so far, as if they had expired. */
    expireAccessTokens: () => {
      for (const grant of grants) {
        for (const accessToken of grant.accessTokens.keys()) {
          grant.accessTokens.set(accessToken, 0)
        }
      }
    },
    /** How many times a refresh token was redeemed. */
    refreshCount: () =>
      oauthRequests.filter(
        (request) => request.params.grant_type === "refresh_token",
      ).length,
    /** End every sign-in, as disconnecting the app on CircuitHub does. */
    disconnectAll: () => {
      for (const grant of grants) grant.revoked = true
    },
  }
}
