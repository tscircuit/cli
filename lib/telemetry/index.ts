import { randomUUID } from "node:crypto"
import type Conf from "conf"
import { cliConfig, type CliConfig } from "lib/cli-config"
import { getVersion } from "lib/getVersion"

const POSTHOG_HOST = "https://us.i.posthog.com"
const TSCI_POSTHOG_PROJECT_API_KEY =
  "phc_htd8AQjSfVEsFCLQMAiUooG4Q0DKBCjqYuQglc9V3Wo"
const POSTHOG_CAPTURE_PATH = "/capture"

export interface TelemetryConfig {
  enabled: boolean
  projectApiKey?: string
  host?: string
  distinctId?: string
}

type TelemetryProperties = Record<
  string,
  string | number | boolean | null | undefined
>

const isTruthy = (value: string | undefined) =>
  value ? ["1", "true", "yes", "on"].includes(value.toLowerCase()) : false

const joinUrl = (host: string, path: string) =>
  `${host.replace(/\/$/, "")}${path}`

export const getTelemetryDistinctId = (config: Conf<CliConfig> = cliConfig) => {
  const accountId = config.get("accountId")
  if (accountId) return `account:${accountId}`

  let anonymousId = config.get("telemetryAnonymousId")
  if (!anonymousId) {
    anonymousId = randomUUID()
    config.set("telemetryAnonymousId", anonymousId)
  }

  return `anonymous:${anonymousId}`
}

export const getTelemetryConfigFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
): TelemetryConfig => {
  if (isTruthy(env.TSCI_TELEMETRY_DISABLED)) {
    return { enabled: false }
  }

  if (env.TSCI_TEST_MODE === "true" && !isTruthy(env.TSCI_TELEMETRY_FORCE)) {
    return { enabled: false }
  }

  if (!TSCI_POSTHOG_PROJECT_API_KEY) return { enabled: false }

  return {
    enabled: true,
    projectApiKey: TSCI_POSTHOG_PROJECT_API_KEY,
    host: POSTHOG_HOST,
    distinctId: getTelemetryDistinctId(),
  }
}

export const captureTelemetryEvent = async (
  event: string,
  properties: TelemetryProperties,
) => {
  const telemetryConfig = getTelemetryConfigFromEnv()
  if (!telemetryConfig.enabled || !telemetryConfig.projectApiKey) return

  const url = joinUrl(POSTHOG_HOST, POSTHOG_CAPTURE_PATH)
  const payload = {
    api_key: telemetryConfig.projectApiKey,
    distinct_id: telemetryConfig.distinctId,
    event,
    properties: {
      ...properties,
      cli_version: getVersion(),
      source: "@tscircuit/cli",
    },
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1_000),
    })
  } catch {
    // Telemetry must never make CLI commands fail.
  }
}
