import Conf from "conf"
import { jwtDecode } from "jwt-decode"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { AUTH_TOKEN_REGEX } from "lib/shared/handle-registry-auth-error"

export interface CliConfig {
  sessionToken?: string
  githubUsername?: string
  accountId?: string
  sessionId?: string
  tscircuitHandle?: string
  registryApiUrl?: string
  alwaysCloneWithAuthorName?: boolean
}

export const getCliConfig = (
  opts: { configDir?: string } = {},
): Conf<CliConfig> => {
  return new Conf({
    projectName: "tscircuit",
    cwd: opts.configDir || process.env.TSCIRCUIT_CONFIG_DIR || undefined,
  })
}

export const cliConfig = getCliConfig()

export const getSessionToken = (): string | undefined => {
  return cliConfig.get("sessionToken")
}

export const getSessionTokenFromNpmrc = (): string | undefined => {
  const npmrcPaths = [
    path.join(process.cwd(), ".npmrc"),
    path.join(os.homedir(), ".npmrc"),
  ]

  for (const npmrcPath of npmrcPaths) {
    if (!fs.existsSync(npmrcPath)) continue
    const content = fs.readFileSync(npmrcPath, "utf-8")
    const match = content.match(AUTH_TOKEN_REGEX)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  return undefined
}

export const setSessionToken = (token: string) => {
  cliConfig.set("sessionToken", token)
  const decoded = jwtDecode<{
    github_username: string
    account_id?: string
    session_id?: string
    tscircuit_handle?: string
  }>(token)

  if (decoded.tscircuit_handle)
    cliConfig.set("tscircuitHandle", decoded.tscircuit_handle)
  if (decoded.account_id) cliConfig.set("accountId", decoded.account_id)
  if (decoded.session_id) cliConfig.set("sessionId", decoded.session_id)
}

export const clearSession = () => {
  cliConfig.clear()
}

export const getRegistryApiUrl = (): string => {
  return cliConfig.get("registryApiUrl") ?? "https://registry-api.tscircuit.com"
}
