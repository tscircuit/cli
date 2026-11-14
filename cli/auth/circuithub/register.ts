import type { Command } from "commander"
import kleur from "kleur"
import {
  clearCircuithubToken,
  decodeCircuithubToken,
  getCircuithubConfig,
  getCircuithubToken,
  isCircuithubTokenExpired,
  setCircuithubToken,
} from "lib/circuithub/circuithub-config"
import { startCircuithubLogin } from "lib/circuithub/login-to-circuithub"

const LOGIN_TIMEOUT_MS = 10 * 60 * 1000

const describeToken = (token: string) => {
  const claims = decodeCircuithubToken(token)
  const name = claims?.name ?? claims?.sub ?? "unknown user"
  const expires = claims?.exp
    ? new Date(claims.exp * 1000).toISOString().replace(/\.\d{3}Z$/, "Z")
    : null
  return { name, expires, expired: isCircuithubTokenExpired(claims) }
}

export const registerAuthCircuithub = (program: Command) => {
  const circuithub = program.commands
    .find((c) => c.name() === "auth")!
    .command("circuithub")
    .description("Log in to CircuitHub to create manufacturing quotes")

  circuithub
    .command("login")
    .description("Log in to CircuitHub in the browser")
    .action(async () => {
      const session = await startCircuithubLogin()
      console.log("Open this URL in a browser and log in to CircuitHub:")
      console.log(`  ${kleur.cyan(session.loginUrl)}`)
      console.log(
        kleur.gray(
          "If the browser is on another machine, paste the URL it ends up on here.",
        ),
      )

      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), LOGIN_TIMEOUT_MS)
      })
      const received = await Promise.race([session.token, timeout])
      clearTimeout(timer)
      session.close()

      if (!received) {
        console.error(kleur.red("Timed out waiting for the CircuitHub login."))
        process.exitCode = 1
        return
      }
      setCircuithubToken(received.token)
      const { name, expires } = describeToken(received.token)
      console.log(kleur.green(`Logged in to CircuitHub as ${kleur.bold(name)}`))
      if (expires) console.log(kleur.gray(`Session expires ${expires}`))
      // Make sure nothing (like a readline on stdin) keeps the process alive.
      process.exit(0)
    })

  circuithub
    .command("status")
    .description("Show the CircuitHub account the CLI uses")
    .action(() => {
      const current = getCircuithubToken()
      if (!current) {
        console.log(
          kleur.yellow(
            `Not logged in to CircuitHub. Run ${kleur.cyan("tsci auth circuithub login")}.`,
          ),
        )
        process.exitCode = 1
        return
      }
      const { name, expires, expired } = describeToken(current.token)
      if (current.source === "env") {
        console.log("Using the CircuitHub token from CIRCUITHUB_TOKEN")
        return
      }
      if (expired) {
        console.log(
          kleur.yellow(
            `The CircuitHub session for ${name} expired ${expires}. Run ${kleur.cyan("tsci auth circuithub login")}.`,
          ),
        )
        process.exitCode = 1
        return
      }
      console.log(`Logged in to CircuitHub as ${kleur.bold(name)}`)
      if (expires) console.log(kleur.gray(`Session expires ${expires}`))
      const workspace = getCircuithubConfig().get("workspace")
      if (workspace) console.log(kleur.gray(`Workspace: ${workspace}`))
    })

  circuithub
    .command("logout")
    .description("Forget the saved CircuitHub session")
    .action(() => {
      clearCircuithubToken()
      console.log("Logged out of CircuitHub")
    })
}
