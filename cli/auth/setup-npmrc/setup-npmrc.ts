import kleur from "kleur"
import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"

const REGISTRY_URL = "npm.tscircuit.com"

function findGlobalNpmrc(): string | null {
  // Common locations for global .npmrc file
  const possiblePaths = [
    // Unix/Linux/macOS: ~/.npmrc
    path.join(os.homedir(), ".npmrc"),
    // Windows: %USERPROFILE%\.npmrc
    process.env.USERPROFILE
      ? path.join(process.env.USERPROFILE, ".npmrc")
      : null,
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
  console.log("\n1. Open or create your global .npmrc file:")
  console.log(kleur.cyan(`   ${path.join(os.homedir(), ".npmrc")}`))
  console.log("\n2. Add the following line:")
  console.log(kleur.cyan(`   //${REGISTRY_URL}/:_authToken=${sessionToken}`))
  console.log("\n3. Ensure the following line is also present:")
  console.log(kleur.cyan(`   @tsci:registry=https://${REGISTRY_URL}/`))
}

export function setupNpmrc(sessionToken: string): boolean {
  const authLine = `//${REGISTRY_URL}/:_authToken=${sessionToken}`
  const registryLine = `@tsci:registry=https://${REGISTRY_URL}/`
  const npmrcPath = findGlobalNpmrc()

  if (!npmrcPath) {
    console.log(kleur.red("Could not find your global .npmrc file location."))
    printManualInstructions(sessionToken)
    return false
  }

  try {
    let existingContent = ""

    if (fs.existsSync(npmrcPath)) {
      existingContent = fs.readFileSync(npmrcPath, "utf-8")
    }

    // Ensure registryLine is present
    let registryAdded = false
    const registryRegex = new RegExp(
      `^${registryLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "m",
    )

    if (!registryRegex.test(existingContent)) {
      // Add registryLine either at the end or on a new line if file isn't empty
      if (existingContent) {
        if (existingContent.endsWith("\n")) {
          existingContent += `${registryLine}\n`
        } else {
          existingContent += `\n${registryLine}\n`
        }
      } else {
        existingContent = `${registryLine}\n`
      }
      registryAdded = true
    }

    // Check if the auth line already exists (with any token)
    const authLineRegex = new RegExp(
      `^//${REGISTRY_URL.replace(/\./g, "\\.")}/:_authToken=.+$`,
      "m",
    )

    if (authLineRegex.test(existingContent)) {
      // Update existing auth line
      const updatedContent = existingContent.replace(authLineRegex, authLine)
      fs.writeFileSync(npmrcPath, updatedContent, "utf-8")
      console.log(
        kleur.green(`Updated authentication token in ${npmrcPath}`) +
          (registryAdded
            ? `\n${kleur.green(`Added registry setting to ${npmrcPath}`)}`
            : ""),
      )
      return true
    }

    // Add new auth line
    const newContent = existingContent
      ? existingContent.endsWith("\n")
        ? `${existingContent}${authLine}\n`
        : `${existingContent}\n${authLine}\n`
      : `${authLine}\n`

    fs.writeFileSync(npmrcPath, newContent, "utf-8")
    if (registryAdded) {
      console.log(
        kleur.green(
          `Added authentication token and registry setting to ${npmrcPath}`,
        ),
      )
    } else {
      console.log(kleur.green(`Added authentication token to ${npmrcPath}`))
    }
    return true
  } catch (error) {
    console.log(
      kleur.red(
        `Could not modify .npmrc file: ${error instanceof Error ? error.message : String(error)}`,
      ),
    )
    printManualInstructions(sessionToken)
    return false
  }
}
