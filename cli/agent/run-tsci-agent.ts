import kleur from "kleur"
import { spawn } from "node:child_process"
import { TSCI_AGENT_BINARY_NAME } from "./constants"

export async function runTsciAgent(args: string[]) {
  return new Promise<number>((resolve) => {
    const child = spawn(TSCI_AGENT_BINARY_NAME, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    })

    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        console.error(
          kleur.red(
            `Could not find ${TSCI_AGENT_BINARY_NAME}. Make sure your global npm bin directory is on PATH.`,
          ),
        )
      } else {
        console.error(
          kleur.red(
            `Failed to run ${TSCI_AGENT_BINARY_NAME}: ${error.message}`,
          ),
        )
      }
      resolve(1)
    })

    child.on("close", (code, signal) => {
      if (signal) {
        console.error(
          kleur.red(`${TSCI_AGENT_BINARY_NAME} exited with signal ${signal}`),
        )
        resolve(1)
        return
      }
      resolve(code ?? 0)
    })
  })
}
