import { createHash, randomBytes } from "node:crypto"
import fs from "node:fs"
import http from "node:http"
import type { AddressInfo } from "node:net"
import path from "node:path"
import readline from "node:readline"
import {
  type CircuithubSignIn,
  getCircuithubConfig,
  getCircuithubLoginUrl,
  getCircuithubResource,
} from "./circuithub-config"

/**
 * Signing in to CircuitHub with OAuth 2.1 and keeping the sign-in alive, as
 * CircuitHub's guide describes
 * (https://api.circuithub.com/docs/getting-started/your-own-program).
 *
 * The user approves the CLI once in a browser. CircuitHub then answers an
 * access token (about an hour) and a refresh token; the CLI renews the access
 * token by itself until the user disconnects it under Settings → Connected
 * apps, or it goes unused for 90 days.
 */

/** Shown on CircuitHub's sign-in page and under Connected apps. */
const CLIENT_NAME = "tscircuit CLI"
/**
 * What the CLI asks for at most. CircuitHub's sign-in page offers only the
 * choices that fit within it, and quoting needs `design`, which comes with
 * "Engineering" (read, design, issues). So ask for exactly that: never
 * ordering or billing, since the CLI does not place orders.
 */
export const CIRCUITHUB_SCOPE = "read design issues"
/** An access token is replaced this long before it expires (at most half its life). */
const REFRESH_MARGIN_MS = 5 * 60_000
const REQUEST_TIMEOUT_MS = 10_000
const LOCK_RETRY_MS = 100
/** Longer than a refresh can take, so a waiter doesn't give up on a slow holder. */
const LOCK_WAIT_MS = 25_000

/** There is no sign-in, or CircuitHub has ended it: only signing in again helps. */
export class CircuithubSignInRequired extends Error {
  constructor(message: string) {
    super(
      `${message} Run \`tsci auth add-provider circuithub\` to sign in again.`,
    )
    this.name = "CircuithubSignInRequired"
  }
}

interface AuthorizationServerMetadata {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  registration_endpoint: string
  revocation_endpoint: string
}

/**
 * When an access token answered at `sentAt` expires, and when to replace it:
 * 5 minutes before, or halfway through a token shorter than 10 minutes, so
 * that short tokens don't cost a renewal per request (CircuitHub allows 20
 * an hour).
 */
const tokenTimes = (sentAt: number, expiresInSeconds: number) => {
  const lifetime = expiresInSeconds * 1000
  return {
    expiresAt: sentAt + lifetime,
    renewAt: sentAt + Math.max(lifetime - REFRESH_MARGIN_MS, lifetime / 2),
  }
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  scope?: string
}

const loadSignIn = () => getCircuithubConfig().get("signIn")
const saveSignIn = (signIn: CircuithubSignIn) =>
  getCircuithubConfig().set("signIn", signIn)
const removeSignIn = () => getCircuithubConfig().delete("signIn")

/** The `error` of an OAuth error answer (RFC 6749 5.2), if the body is one. */
const oauthError = (body: string): unknown => {
  try {
    return JSON.parse(body).error
  } catch {
    return undefined
  }
}

const postForm = async (url: string, form: Record<string, string>) => {
  const response = await fetch(url, {
    method: "POST",
    body: new URLSearchParams(form),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  return {
    ok: response.ok,
    status: response.status,
    body: await response.text(),
  }
}

/**
 * Runs `work` holding a lock file beside the saved sign-in, so that only one
 * process refreshes at a time: each refresh token works once.
 *
 * A process killed while holding it leaves the file behind. It is never
 * removed here, since a waiter cannot tell an abandoned lock from a slow one.
 */
const withSignInLock = async <T>(work: () => Promise<T>): Promise<T> => {
  const lockPath = path.join(
    path.dirname(getCircuithubConfig().path),
    "circuithub.lock",
  )
  fs.mkdirSync(path.dirname(lockPath), { recursive: true })
  const deadline = Date.now() + LOCK_WAIT_MS
  for (;;) {
    try {
      fs.writeFileSync(lockPath, String(process.pid), {
        flag: "wx",
        mode: 0o600,
      })
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
    }
    if (Date.now() > deadline) {
      throw new Error(
        `Another tsci process is holding ${lockPath}. If none is running, delete that file.`,
      )
    }
    await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS))
  }
  try {
    return await work()
  } finally {
    fs.rmSync(lockPath, { force: true })
  }
}

/** Whether a saved sign-in is for this CircuitHub API (not, say, a staging one). */
export const isCircuithubSignInForThisApi = (
  signIn: CircuithubSignIn | undefined,
): signIn is CircuithubSignIn =>
  signIn !== undefined && signIn.resource === getCircuithubResource()

/**
 * Whether there is a saved sign-in for this API. Its access token may have
 * expired: it is renewed when used, and CircuitHub may still refuse that.
 */
export const hasCircuithubSignIn = () =>
  isCircuithubSignInForThisApi(loadSignIn())

/** The saved sign-in for this API, if any. */
export const getCircuithubSignIn = () => {
  const signIn = loadSignIn()
  return isCircuithubSignInForThisApi(signIn) ? signIn : undefined
}

/**
 * An access token for the saved sign-in, renewed when it is about to expire.
 * Pass `rejected` when the API answered 401 `invalid_token` to the token you
 * sent: it is then replaced even if it has not expired.
 */
export const getCircuithubAccessToken = async (
  options: { rejected?: string } = {},
): Promise<string> => {
  const usable = (signIn: CircuithubSignIn | undefined) =>
    isCircuithubSignInForThisApi(signIn) &&
    signIn.accessToken !== options.rejected &&
    Date.now() < signIn.renewAt

  const current = loadSignIn()
  if (usable(current)) return current!.accessToken

  return withSignInLock(async () => {
    // Read again: another process may have refreshed while this one waited,
    // and its refresh token is then the only one that works.
    const stored = loadSignIn()
    if (!isCircuithubSignInForThisApi(stored)) {
      throw new CircuithubSignInRequired("Not signed in to CircuitHub.")
    }
    if (usable(stored)) return stored.accessToken

    const sentAt = Date.now()
    const refresh = () =>
      postForm(stored.tokenEndpoint, {
        grant_type: "refresh_token",
        refresh_token: stored.refreshToken,
        client_id: stored.clientId,
      })
    // An answer can be lost on the way back after the server used up the
    // refresh token. Asking again at once is safe: for 30 seconds the old
    // token answers a new pair once more.
    const response = await refresh().catch(refresh)
    const refusal =
      response.status === 400 || response.status === 401
        ? oauthError(response.body)
        : undefined
    if (refusal === "invalid_grant" || refusal === "invalid_client") {
      // Disconnected under Settings → Connected apps, or unused for 90 days.
      removeSignIn()
      throw new CircuithubSignInRequired("CircuitHub has ended this sign-in.")
    }
    // Anything else (429, 503, ...) is worth trying later: the refresh token is unused.
    if (!response.ok) {
      throw new Error(
        `Renewing the CircuitHub sign-in failed with HTTP ${response.status}: ${response.body.slice(0, 300)}`,
      )
    }
    const tokens = JSON.parse(response.body) as TokenResponse
    // Save before using the new access token: the old refresh token works a
    // few more seconds only, so losing the new one loses the sign-in.
    saveSignIn({
      ...stored,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      ...tokenTimes(sentAt, tokens.expires_in),
      scope: tokens.scope ?? stored.scope,
    })
    return tokens.access_token
  })
}

const getJson = async (url: string) => {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok)
    throw new Error(`GET ${url} failed with HTTP ${response.status}`)
  return response.json()
}

export interface CircuithubSignInSession {
  /** The sign-in page to open in a browser. */
  authorizeUrl: string
  /** Resolves once the sign-in is saved. */
  done: Promise<CircuithubSignIn>
  close: () => void
}

/**
 * Start signing in: register the CLI, listen on 127.0.0.1 for the browser
 * coming back, and build the sign-in page's address. When the browser runs
 * on another machine (SSH, a cloud dev box) its redirect cannot reach this
 * one, so the URL it ends up on can be pasted into the terminal instead.
 */
export const startCircuithubSignIn = async ({
  acceptPastedInput = true,
}: { acceptPastedInput?: boolean } = {}): Promise<CircuithubSignInSession> => {
  const loginUrl = getCircuithubLoginUrl()
  // 1. Where the endpoints are (RFC 8414).
  const metadata = (await getJson(
    `${loginUrl}/.well-known/oauth-authorization-server`,
  )) as AuthorizationServerMetadata
  if (metadata.issuer !== loginUrl) {
    throw new Error(
      `${loginUrl} answered for another server: ${metadata.issuer}`,
    )
  }

  // 2. Register (RFC 7591). The same name and redirect answer the same
  // client_id, so registering at every sign-in is fine.
  const registration = await fetch(metadata.registration_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: CLIENT_NAME,
      // On this computer; the port may differ at each sign-in.
      redirect_uris: ["http://127.0.0.1/callback"],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!registration.ok) {
    throw new Error(
      `Registering the CLI with CircuitHub failed with HTTP ${registration.status}: ${(await registration.text()).slice(0, 300)}`,
    )
  }
  const { client_id: clientId } = (await registration.json()) as {
    client_id: string
  }

  // 3. Listen on this computer for the browser coming back.
  let resolveAnswer!: (answer: URLSearchParams) => void
  const answered = new Promise<URLSearchParams>((resolve) => {
    resolveAnswer = resolve
  })
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1")
    if (url.pathname !== "/callback") {
      response.writeHead(404).end()
      return
    }
    response
      .writeHead(200, { "Content-Type": "text/plain" })
      .end("You can close this tab and go back to your terminal.\n")
    resolveAnswer(url.searchParams)
  })
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => resolve())
  })
  const redirectUri = `http://127.0.0.1:${(server.address() as AddressInfo).port}/callback`

  let rl: readline.Interface | undefined
  if (acceptPastedInput && process.stdin.isTTY) {
    rl = readline.createInterface({ input: process.stdin })
    rl.on("line", (line) => {
      const text = line.trim()
      if (!text) return
      const query = text.includes("?")
        ? text.slice(text.indexOf("?") + 1)
        : text
      const answer = new URLSearchParams(query)
      if (answer.has("code") || answer.has("error")) resolveAnswer(answer)
      else {
        process.stderr.write(
          "That isn't the address CircuitHub sent the browser to. Paste the full URL from the browser's address bar.\n",
        )
      }
    })
  }

  // 4. The sign-in page. PKCE (RFC 7636) proves the program redeeming the
  // code is the one that asked; `state` that the answer is for this request.
  const verifier = randomBytes(32).toString("base64url")
  const state = randomBytes(16).toString("base64url")
  const authorize = new URL(metadata.authorization_endpoint)
  authorize.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    state,
    // Which API the tokens are for (RFC 8707). Without it they are for
    // CircuitHub's MCP server, and the API refuses them.
    resource: getCircuithubResource(),
    scope: CIRCUITHUB_SCOPE,
  }).toString()

  const close = () => {
    rl?.close()
    server.close()
    server.closeAllConnections?.()
  }

  const done = (async () => {
    const answer = await answered
    // 5. Check the answer before using anything in it.
    if (answer.get("state") !== state) {
      throw new Error("The CircuitHub sign-in answer is not for this request.")
    }
    if (answer.get("iss") !== metadata.issuer) {
      throw new Error("The CircuitHub sign-in answer came from another server.")
    }
    if (answer.has("error")) {
      throw new Error(
        `CircuitHub sign-in refused: ${answer.get("error_description") ?? answer.get("error")}`,
      )
    }
    // 6. Redeem the code for tokens (it works once, for two minutes).
    const sentAt = Date.now()
    const response = await postForm(metadata.token_endpoint, {
      grant_type: "authorization_code",
      code: answer.get("code") ?? "",
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
      resource: getCircuithubResource(),
    })
    if (!response.ok) {
      throw new Error(
        `Redeeming the CircuitHub sign-in failed with HTTP ${response.status}: ${response.body.slice(0, 300)}`,
      )
    }
    const tokens = JSON.parse(response.body) as TokenResponse
    const signIn: CircuithubSignIn = {
      clientId,
      tokenEndpoint: metadata.token_endpoint,
      revocationEndpoint: metadata.revocation_endpoint,
      resource: getCircuithubResource(),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      ...tokenTimes(sentAt, tokens.expires_in),
      scope: tokens.scope ?? CIRCUITHUB_SCOPE,
    }
    await withSignInLock(async () => saveSignIn(signIn))
    return signIn
  })()

  return { authorizeUrl: authorize.toString(), done, close }
}

/**
 * End the sign-in at CircuitHub (RFC 7009) and remove it from this computer.
 * Revoking the refresh token ends its access tokens too. Returns whether
 * there was a sign-in.
 */
export const signOutOfCircuithub = async (): Promise<boolean> =>
  withSignInLock(async () => {
    const stored = loadSignIn()
    if (!stored) return false
    const response = await postForm(stored.revocationEndpoint, {
      token: stored.refreshToken,
      client_id: stored.clientId,
    })
    // Keep it so signing out can be tried again: nothing else could end it.
    if (!response.ok) {
      throw new Error(
        `Signing out of CircuitHub failed with HTTP ${response.status}: ${response.body.slice(0, 300)}`,
      )
    }
    removeSignIn()
    return true
  })
