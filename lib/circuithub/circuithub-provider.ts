import {
  type CircuithubTokenClaims,
  decodeCircuithubToken,
  getCircuithubConfig,
  getCircuithubToken,
  isCircuithubTokenExpired,
  setCircuithubToken,
} from "./circuithub-config"
import { openInBrowser, terminalLink } from "lib/shared/open-in-browser"
import { shouldBeInteractive } from "lib/utils/should-be-interactive"
import { startCircuithubLogin } from "./login-to-circuithub"

const LOGIN_TIMEOUT_MS = 10 * 60 * 1000

const getAccountName = (claims: CircuithubTokenClaims | null) =>
  claims?.name ?? claims?.sub ?? "unknown user"

/** Whether there's a CircuitHub session `tsci quote create --circuithub` can use. */
export const hasCircuithubSession = () => {
  const current = getCircuithubToken()
  if (!current) return false
  if (current.source === "env") return true
  return !isCircuithubTokenExpired(decodeCircuithubToken(current.token))
}

/**
 * `tsci add-provider circuithub`: log in to CircuitHub and save the session.
 * CircuitHub's login page redirects the browser to a local callback with the
 * session token; when the browser is on another machine, the user pastes the
 * URL it lands on instead. An existing, unexpired session is kept.
 */
export const addCircuithubProvider = async ({
  log,
}: {
  log: (message: string) => void
}) => {
  const current = getCircuithubToken()
  if (current?.source === "env") {
    log("CircuitHub is already added: using the token from CIRCUITHUB_TOKEN.")
    return
  }
  const claims = current ? decodeCircuithubToken(current.token) : null
  if (current && !isCircuithubTokenExpired(claims)) {
    log(`CircuitHub is already added (logged in as ${getAccountName(claims)}).`)
    return
  }

  const session = await startCircuithubLogin()
  // In a terminal, open the login page; tests and CI just get the link.
  const opened = shouldBeInteractive() && openInBrowser(session.loginUrl)
  log(
    current
      ? "Your CircuitHub session expired. Log in to CircuitHub to add it again:"
      : "Log in to CircuitHub to add it as a provider:",
  )
  if (opened)
    log(
      "  Opened the login page in your browser. If it didn't open, use this link:",
    )
  log(
    `  ${process.stdout.isTTY ? terminalLink(session.loginUrl) : session.loginUrl}`,
  )
  log("If the browser is on another machine, paste the URL it ends up on here.")

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), LOGIN_TIMEOUT_MS)
  })
  const received = await Promise.race([session.token, timeout])
  clearTimeout(timer)
  session.close()
  if (!received) throw new Error("Timed out waiting for the CircuitHub login.")

  setCircuithubToken(received.token)
  log(`Added CircuitHub (logged in as ${getAccountName(received.claims)})`)
}

/**
 * `tsci remove-provider circuithub`: forget the saved CircuitHub session and
 * remembered workspace. A `CIRCUITHUB_TOKEN` in the environment can't be
 * removed from here, so say that it still applies.
 */
export const removeCircuithubProvider = async ({
  log,
}: {
  log: (message: string) => void
}) => {
  const config = getCircuithubConfig()
  const saved = config.get("token")
  config.clear()
  log(
    saved
      ? `Removed CircuitHub (was logged in as ${getAccountName(decodeCircuithubToken(saved))}).`
      : "CircuitHub isn't added; nothing to remove.",
  )
  if (process.env.CIRCUITHUB_TOKEN || process.env.CIRCUITHUB_API_KEY) {
    log(
      "CIRCUITHUB_TOKEN is still set in the environment, so quotes keep using it until you unset it.",
    )
  }
}
