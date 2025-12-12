import type { Command } from "commander"
import kleur from "kleur"
import { getSessionToken } from "lib/cli-config"
import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"

const REGISTRY_URL = "npm.tscircuit.com"

function findUserNpmrc(): string | null {
  // Common locations for user-level .npmrc
  const possiblePaths = [
    // Unix/Linux/macOS: ~/.npmrc
    path.join(os.homedir(), ".npmrc"),
    // Windows: %USERPROFILE%\.npmrc
    process.env.USERPROFILE
      ? path.join(process.env.USERPROFILE, ".npmrc")
      : null,
    // npm config prefix location (for some setups)
    process.env.NPM_CONFIG_USERCONFIG,
  ].filter(Boolean) as string[]

  // Return the first existing path, or the default home directory path
  for (const npmrcPath of possiblePaths) {
    if (fs.existsSync(npmrcPath)) {
      return npmrcPath
    }
  }

  // Return the default location even if it doesn't exist yet
  return path.join(os.homedir(), ".npmrc")
}

function printManualInstructions(sessionToken: string) {
  console.log(kleur.yellow("\nManual setup instructions:"))
  console.log(kleur.gray("─".repeat(50)))
  console.log("\n1. Open or create your user-level .npmrc file:")
  console.log(kleur.cyan(`   ${path.join(os.homedir(), ".npmrc")}`))
  console.log("\n2. Add the following line:")
  console.log(kleur.cyan(`   //${REGISTRY_URL}/:_authToken=${sessionToken}`))
  console.log(kleur.gray("\n─".repeat(50)))
}

export function registerSetupNpmrc(program: Command) {
  program
    .command("setup-npmrc")
    .description(
      "Configure user-level .npmrc with authentication for tscircuit private packages",
    )
    .action(async () => {
      const sessionToken = getSessionToken()

      if (!sessionToken) {
        console.log(
          kleur.red("Error: Not logged in. Please run 'tsci login' first."),
        )
        process.exit(1)
      }

      const authLine = `//${REGISTRY_URL}/:_authToken=${sessionToken}`
      const npmrcPath = findUserNpmrc()

      if (!npmrcPath) {
        console.log(
          kleur.red("Could not find the user-level .npmrc file location."),
        )
        printManualInstructions(sessionToken)
        process.exit(1)
      }

      try {
        let existingContent = ""

        if (fs.existsSync(npmrcPath)) {
          existingContent = fs.readFileSync(npmrcPath, "utf-8")

          // Check if the auth line already exists (with any token)
          const authLineRegex = new RegExp(
            `^//${REGISTRY_URL.replace(/\./g, "\\.")}/:_authToken=.+$`,
            "m",
          )

          if (authLineRegex.test(existingContent)) {
            // Update existing auth line
            const updatedContent = existingContent.replace(
              authLineRegex,
              authLine,
            )
            fs.writeFileSync(npmrcPath, updatedContent, "utf-8")
            console.log(
              kleur.green(`Updated authentication token in user-level .npmrc`),
            )
            console.log(kleur.gray(`Location: ${npmrcPath}`))
            return
          }
        }

        // Add new auth line
        const newContent = existingContent
          ? existingContent.endsWith("\n")
            ? `${existingContent}${authLine}\n`
            : `${existingContent}\n${authLine}\n`
          : `${authLine}\n`

        fs.writeFileSync(npmrcPath, newContent, "utf-8")
        console.log(
          kleur.green(`Added authentication token to user-level .npmrc`),
        )
        console.log(kleur.gray(`Location: ${npmrcPath}`))
      } catch (error) {
        console.log(
          kleur.red(
            `Could not modify .npmrc file: ${error instanceof Error ? error.message : String(error)}`,
          ),
        )
        printManualInstructions(sessionToken)
        process.exit(1)
      }
    })
}
