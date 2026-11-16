import {
  decodeCircuithubToken,
  getCircuithubToken,
  isCircuithubTokenExpired,
  setCircuithubToken,
} from "./circuithub-config"
import { startCircuithubLogin } from "./login-to-circuithub"

const LOGIN_TIMEOUT_MS = 10 * 60 * 1000

/**
 * Make sure there is a usable CircuitHub session, logging in if there isn't:
 * print CircuitHub's login URL and wait for the browser to hand the token to
 * the local callback (or for the user to paste the URL it lands on). A
 * `CIRCUITHUB_TOKEN` from the environment is used as is.
 */
export const ensureCircuithubLogin = async ({
  log,
}: {
  log: (message: string) => void
}) => {
  const current = getCircuithubToken()
  if (current?.source === "env") return
  const expired =
    current !== undefined &&
    isCircuithubTokenExpired(decodeCircuithubToken(current.token))
  if (current && !expired) return

  const session = await startCircuithubLogin()
  log(
    expired
      ? "Your CircuitHub session expired. Log in to CircuitHub to continue:"
      : "Log in to CircuitHub to continue:",
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
  const name = received.claims.name ?? received.claims.sub ?? "unknown user"
  log(`Logged in to CircuitHub as ${name}`)
}
