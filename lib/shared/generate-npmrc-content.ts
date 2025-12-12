import { getSessionToken } from "lib/cli-config"

/**
 * Generates .npmrc content for tscircuit registry with optional authentication.
 * If a session token is available, it will be included for private package access.
 *
 * @returns The .npmrc content string
 */
export function generateNpmrcContent(): string {
  const lines = ["@tsci:registry=https://npm.tscircuit.com"]

  const sessionToken = getSessionToken()
  if (sessionToken) {
    lines.push(`//npm.tscircuit.com/:_authToken=${sessionToken}`)
  }

  return lines.join("\n")
}
