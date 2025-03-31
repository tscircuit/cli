import Conf from "conf"
import { jwtDecode } from "jwt-decode"

export interface CliConfig {
  sessionToken?: string
  githubUsername?: string
  registryApiUrl?: string
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
  }>(token)
  cliConfig.set("githubUsername", decoded.github_username)
}

export const clearSession = () => {
  cliConfig.delete("sessionToken")
  cliConfig.delete("githubUsername")
}

export const getRegistryApiUrl = (): string => {
  return cliConfig.get("registryApiUrl") ?? "https://registry-api.tscircuit.com"
}
