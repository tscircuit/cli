import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import kleur from "kleur"

export const AUTH_TOKEN_REGEX = /^\/\/npm\.tscircuit\.com\/:_authToken=(.+)$/m

function isUnauthorizedError(error: unknown): boolean {
  const output = [
    error instanceof Error ? error.message : "",
    (error as { stderr?: Buffer | string })?.stderr?.toString?.() ?? "",
    (error as { stdout?: Buffer | string })?.stdout?.toString?.() ?? "",
  ].join("\n")

  const registryErrorMatch = output.match(/error:\s*(\{[\s\S]*?\})/i)
  if (registryErrorMatch) {
    const errorBody = registryErrorMatch[1]
    const errorCode =
      errorBody.match(/error_code\s*:\s*['"]?([^,'"}\s]+)/i)?.[1] ?? ""
    const message = errorBody.match(/message\s*:\s*['"]?([^'"}]+)/i)?.[1] ?? ""

    if (
      /unauth|token|auth/i.test(errorCode) ||
      /unauth|token|auth/i.test(message)
    ) {
      return true
    }
  }

  return /\b(401|E401)\b/i.test(output) || /unauthorized/i.test(output)
}

function hasTsciAuthToken(npmrcPath: string): boolean {
  if (!fs.existsSync(npmrcPath)) return false
  const content = fs.readFileSync(npmrcPath, "utf-8")
  return AUTH_TOKEN_REGEX.test(content)
}

export function handleRegistryAuthError({
  error,
  projectDir,
}: {
  error: unknown
  projectDir: string
}) {
  if (!isUnauthorizedError(error)) return

  const npmrcPaths = [
    path.join(projectDir, ".npmrc"),
    path.join(os.homedir(), ".npmrc"),
  ]
  const hasToken = npmrcPaths.some(hasTsciAuthToken)

  if (hasToken) {
    console.warn(
      kleur.yellow(
        "Your tscircuit session token appears to be missing or expired. Run `tsci auth setup-npmrc` to refresh it before retrying.",
      ),
    )
  } else {
    console.warn(
      kleur.yellow(
        "No tscircuit session token is loaded in your .npmrc files. Run `tsci auth setup-npmrc` to add one and retry the install.",
      ),
    )
  }
}
