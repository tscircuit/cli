import http from "node:http"
import type { AddressInfo } from "node:net"
import readline from "node:readline"
import {
  type CircuithubTokenClaims,
  decodeCircuithubToken,
  getCircuithubLoginUrl,
  isCircuithubTokenExpired,
} from "./circuithub-config"

const CALLBACK_PATH = "/cb"

const SUCCESS_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><title>tscircuit</title></head>
<body style="font-family: system-ui, sans-serif; padding: 48px; text-align: center">
<h2>Logged in to CircuitHub</h2>
<p>You can close this tab and return to the terminal.</p>
</body></html>`

const FAILURE_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><title>tscircuit</title></head>
<body style="font-family: system-ui, sans-serif; padding: 48px; text-align: center">
<h2>CircuitHub login failed</h2>
<p>No valid token was received. Run <code>tsci auth circuithub login</code> again.</p>
</body></html>`

/**
 * Pull the token out of what CircuitHub sends back: the full callback URL
 * (`http://localhost:<port>/cb?token=...`), just its query string, or the
 * bare token. Returns null for anything that isn't an unexpired JWT.
 */
export const parseCircuithubCallback = (
  input: string,
): { token: string; claims: CircuithubTokenClaims } | null => {
  const text = input.trim()
  if (!text) return null
  let token: string | null = text
  if (text.includes("token=")) {
    const query = text.slice(text.indexOf("?") + 1)
    token = new URLSearchParams(query).get("token")
  }
  if (!token) return null
  const claims = decodeCircuithubToken(token)
  if (!claims || isCircuithubTokenExpired(claims)) return null
  return { token, claims }
}

export interface CircuithubLoginSession {
  /** The page to open in a browser. */
  loginUrl: string
  /** Resolves once a token arrives at the callback or is pasted on stdin. */
  token: Promise<{ token: string; claims: CircuithubTokenClaims }>
  close: () => void
}

/**
 * Log in the way CircuitHub's own CLI does: CircuitHub redirects the browser
 * to a callback on this machine with `?token=<session JWT>`. A local server
 * on a free port receives it.
 *
 * When the browser runs on another machine (SSH, a cloud dev box) the
 * redirect can't reach this one, so the user can paste the URL the browser
 * ended up on (or just the token) into the terminal instead.
 */
export const startCircuithubLogin = async ({
  acceptPastedInput = true,
}: { acceptPastedInput?: boolean } = {}): Promise<CircuithubLoginSession> => {
  let resolveToken!: (value: {
    token: string
    claims: CircuithubTokenClaims
  }) => void
  const token = new Promise<{ token: string; claims: CircuithubTokenClaims }>(
    (resolve) => {
      resolveToken = resolve
    },
  )

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost")
    if (url.pathname !== CALLBACK_PATH) {
      res.writeHead(404).end()
      return
    }
    const received = parseCircuithubCallback(url.search)
    res.writeHead(received ? 200 : 400, { "Content-Type": "text/html" })
    res.end(received ? SUCCESS_PAGE : FAILURE_PAGE)
    if (received) resolveToken(received)
  })
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => resolve())
  })
  const { port } = server.address() as AddressInfo

  // Browsers may resolve `localhost` to ::1 first; listen there too if the
  // machine has IPv6 (and quietly skip it if not).
  const ipv6Server = http.createServer(server.listeners("request")[0] as any)
  ipv6Server.on("error", () => {})
  ipv6Server.listen(port, "::1")

  let rl: readline.Interface | undefined
  if (acceptPastedInput && process.stdin.isTTY) {
    rl = readline.createInterface({ input: process.stdin })
    rl.on("line", (line) => {
      const received = parseCircuithubCallback(line)
      if (received) resolveToken(received)
      else if (line.trim()) {
        process.stderr.write(
          "That doesn't contain a valid CircuitHub token. Paste the full URL from the browser's address bar.\n",
        )
      }
    })
  }

  const redirectUri = `http://localhost:${port}${CALLBACK_PATH}`
  // Unencoded, exactly as CircuitHub's CLI sends it (":" and "/" are valid
  // in a query string).
  const loginUrl = `${getCircuithubLoginUrl()}?redirect_uri=${redirectUri}`

  const close = () => {
    rl?.close()
    server.close()
    ipv6Server.close()
    server.closeAllConnections?.()
    ipv6Server.closeAllConnections?.()
  }

  return { loginUrl, token, close }
}
