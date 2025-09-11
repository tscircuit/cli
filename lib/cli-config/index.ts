import Conf from "conf"
import { jwtDecode } from "jwt-decode"

export interface CliConfig {
  sessionToken?: string
  githubUsername?: string
  accountId?: string
  sessionId?: string
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

export const setSessionToken = (token: string) => {
  cliConfig.set("sessionToken", token)
  const decoded = jwtDecode<{
    github_username: string
    account_id?: string
    session_id?: string
  }>(token)
  cliConfig.set("githubUsername", decoded.github_username)
  if (decoded.account_id) cliConfig.set("accountId", decoded.account_id)
  if (decoded.session_id) cliConfig.set("sessionId", decoded.session_id)
}

export const clearSession = () => {
  cliConfig.delete("sessionToken")
  cliConfig.delete("githubUsername")
  cliConfig.delete("accountId")
  cliConfig.delete("sessionId")
}

export const getRegistryApiUrl = (): string => {
  return cliConfig.get("registryApiUrl") ?? "https://registry-api.tscircuit.com"
}
