import {
  type CircuithubTokenClaims,
  decodeCircuithubToken,
  getCircuithubToken,
  isCircuithubTokenExpired,
  setCircuithubToken,
} from "./circuithub-config"
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
  log(
    current
      ? "Your CircuitHub session expired. Log in to CircuitHub to add it again:"
      : "Log in to CircuitHub to add it as a provider:",
  )
  log(`  ${session.loginUrl}`)
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
