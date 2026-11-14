import Conf from "conf"
import { jwtDecode } from "jwt-decode"

export const DEFAULT_CIRCUITHUB_API_URL = "https://api.circuithub.com/v1"
export const DEFAULT_CIRCUITHUB_LOGIN_URL =
  "https://app.circuithub.com/platform/v1/auth/cli"

interface CircuithubConfig {
  token?: string
  workspace?: string
}

/**
 * CircuitHub credentials live in their own file next to the registry config,
 * so `tsci logout` (which clears the registry session) leaves them alone.
 */
export const getCircuithubConfig = (): Conf<CircuithubConfig> =>
  new Conf<CircuithubConfig>({
    projectName: "tscircuit",
    configName: "circuithub",
    cwd: process.env.TSCIRCUIT_CONFIG_DIR || undefined,
  })

export interface CircuithubTokenClaims {
  sub?: string
  name?: string
  exp?: number
}

export const decodeCircuithubToken = (
  token: string,
): CircuithubTokenClaims | null => {
  try {
    return jwtDecode<CircuithubTokenClaims>(token)
  } catch {
    return null
  }
}

export const isCircuithubTokenExpired = (
  claims: CircuithubTokenClaims | null,
  now = Date.now(),
) => typeof claims?.exp === "number" && claims.exp * 1000 <= now

export type CircuithubTokenSource = "env" | "login"

/**
 * The token to call CircuitHub with: `CIRCUITHUB_TOKEN` (an API key or a
 * session token) wins over the one saved by `tsci auth circuithub login`.
 */
export const getCircuithubToken = ():
  | { token: string; source: CircuithubTokenSource }
  | undefined => {
  const envToken =
    process.env.CIRCUITHUB_TOKEN || process.env.CIRCUITHUB_API_KEY
  if (envToken) return { token: envToken, source: "env" }
  const saved = getCircuithubConfig().get("token")
  return saved ? { token: saved, source: "login" } : undefined
}

export const setCircuithubToken = (token: string) =>
  getCircuithubConfig().set("token", token)

export const clearCircuithubToken = () => getCircuithubConfig().delete("token")

export const getCircuithubApiUrl = () =>
  (process.env.CIRCUITHUB_API_URL || DEFAULT_CIRCUITHUB_API_URL).replace(
    /\/+$/,
    "",
  )

export const getCircuithubLoginUrl = () =>
  process.env.CIRCUITHUB_LOGIN_URL || DEFAULT_CIRCUITHUB_LOGIN_URL

export const getSavedCircuithubWorkspace = () =>
  process.env.CIRCUITHUB_WORKSPACE || getCircuithubConfig().get("workspace")

export const saveCircuithubWorkspace = (workspace: string) =>
  getCircuithubConfig().set("workspace", workspace)
