import { openInBrowser, terminalLink } from "lib/shared/open-in-browser"
import { shouldBeInteractive } from "lib/utils/should-be-interactive"
import { getCircuithubConfig, getCircuithubEnvToken } from "./circuithub-config"
import {
  getCircuithubSignIn,
  hasCircuithubSignIn,
  signOutOfCircuithub,
  startCircuithubSignIn,
} from "./circuithub-oauth"

const SIGN_IN_TIMEOUT_MS = 10 * 60 * 1000

/** Whether `tsci quote create --circuithub` has a way to call CircuitHub. */
export const hasCircuithubSession = () =>
  Boolean(getCircuithubEnvToken()) || hasCircuithubSignIn()

const describeAccess = (scope: string | undefined) =>
  scope ? ` (access: ${scope.split(" ").join(", ")})` : ""

/**
 * `tsci auth add-provider circuithub`: sign in to CircuitHub in a browser and
 * save the sign-in. The CLI renews its access token by itself, so this is
 * needed once, until the sign-in is disconnected on CircuitHub or goes
 * unused for 90 days.
 */
export const addCircuithubProvider = async ({
  log,
}: {
  log: (message: string) => void
}) => {
  if (getCircuithubEnvToken()) {
    log("CircuitHub is already added: using the token from CIRCUITHUB_TOKEN.")
    return
  }
  const current = getCircuithubSignIn()
  if (current) {
    log(`CircuitHub is already added${describeAccess(current.scope)}.`)
    return
  }

  const session = await startCircuithubSignIn()
  try {
    // In a terminal, open the sign-in page; tests and CI just get the link.
    const opened = shouldBeInteractive() && openInBrowser(session.authorizeUrl)
    log("Sign in to CircuitHub to add it as a provider:")
    if (opened)
      log(
        "  Opened the sign-in page in your browser. If it didn't open, use this link:",
      )
    log(
      `  ${process.stdout.isTTY ? terminalLink(session.authorizeUrl) : session.authorizeUrl}`,
    )
    log(
      "If the browser is on another machine, paste the URL it ends up on here.",
    )

    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), SIGN_IN_TIMEOUT_MS)
    })
    const signIn = await Promise.race([session.done, timeout]).finally(() =>
      clearTimeout(timer),
    )
    if (!signIn)
      throw new Error("Timed out waiting for the CircuitHub sign-in.")
    log(`Added CircuitHub${describeAccess(signIn.scope)}.`)
  } finally {
    session.close()
  }
}

/**
 * `tsci auth remove-provider circuithub`: end the sign-in at CircuitHub and
 * forget it and the remembered workspace. A `CIRCUITHUB_TOKEN` in the
 * environment can't be removed from here, so say that it still applies.
 */
export const removeCircuithubProvider = async ({
  log,
}: {
  log: (message: string) => void
}) => {
  const signedOut = await signOutOfCircuithub()
  const config = getCircuithubConfig()
  // Also drops a session token saved by older versions, which only expires.
  const hadOldToken = config.has("token" as never)
  config.clear()
  log(
    signedOut
      ? "Removed CircuitHub and ended its sign-in."
      : hadOldToken
        ? "Removed CircuitHub."
        : "CircuitHub isn't added; nothing to remove.",
  )
  if (getCircuithubEnvToken()) {
    log(
      "CIRCUITHUB_TOKEN is still set in the environment, so quotes keep using it until you unset it.",
    )
  }
}
