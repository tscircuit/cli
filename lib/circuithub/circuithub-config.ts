import Conf from "conf"

export const DEFAULT_CIRCUITHUB_API_URL = "https://api.circuithub.com/v1"
/** CircuitHub's OAuth server (the issuer in its authorization server metadata). */
export const DEFAULT_CIRCUITHUB_LOGIN_URL = "https://app.circuithub.com"

/** A CircuitHub sign-in saved by `tsci auth add-provider circuithub`. */
export interface CircuithubSignIn {
  clientId: string
  tokenEndpoint: string
  revocationEndpoint: string
  /** The API the tokens are for. */
  resource: string
  accessToken: string
  /** Works once: each refresh answers a new one, saved in its place. */
  refreshToken: string
  /** When `accessToken` expires, in milliseconds since the epoch. */
  expiresAt: number
  /** When to replace `accessToken`: a little before it expires. */
  renewAt: number
  scope?: string
}

interface CircuithubConfig {
  signIn?: CircuithubSignIn
  workspace?: string
  /** The revision `tsci quote create --circuithub` uploaded last. */
  lastRevision?: { projectId: number; revisionId: number }
}

/**
 * CircuitHub credentials live in their own file next to the registry config,
 * so `tsci logout` (which clears the registry session) leaves them alone.
 * Only the user can read it: a refresh token keeps working for months.
 */
export const getCircuithubConfig = (): Conf<CircuithubConfig> =>
  new Conf<CircuithubConfig>({
    projectName: "tscircuit",
    configName: "circuithub",
    cwd: process.env.TSCIRCUIT_CONFIG_DIR || undefined,
    configFileMode: 0o600,
  })

/** A token set in the environment, used as is instead of the saved sign-in. */
export const getCircuithubEnvToken = () =>
  process.env.CIRCUITHUB_TOKEN || process.env.CIRCUITHUB_API_KEY || undefined

export const getCircuithubApiUrl = () =>
  (process.env.CIRCUITHUB_API_URL || DEFAULT_CIRCUITHUB_API_URL).replace(
    /\/+$/,
    "",
  )

/**
 * The API that sign-in tokens are requested for (OAuth `resource`): the API
 * URL without its version path, e.g. https://api.circuithub.com.
 */
export const getCircuithubResource = () =>
  getCircuithubApiUrl().replace(/\/v\d+$/, "")

export const getCircuithubLoginUrl = () =>
  (process.env.CIRCUITHUB_LOGIN_URL || DEFAULT_CIRCUITHUB_LOGIN_URL).replace(
    /\/+$/,
    "",
  )

export const getSavedCircuithubWorkspace = () =>
  process.env.CIRCUITHUB_WORKSPACE || getCircuithubConfig().get("workspace")

export const saveCircuithubWorkspace = (workspace: string) =>
  getCircuithubConfig().set("workspace", workspace)

export const getLastCircuithubRevision = () =>
  getCircuithubConfig().get("lastRevision")

export const saveLastCircuithubRevision = (revision: {
  projectId: number
  revisionId: number
}) => getCircuithubConfig().set("lastRevision", revision)
