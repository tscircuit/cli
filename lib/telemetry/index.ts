import { randomUUID } from "node:crypto"
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
    distinctId: `tscircuit-cli-${randomUUID()}`,
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
    })
  } catch {
    // Telemetry must never make CLI commands fail.
  }
}

export const withTelemetryEvent = async <T>(
  event: string,
  properties: TelemetryProperties,
  action: () => Promise<T>,
): Promise<T> => {
  const startedAt = Date.now()

  try {
    const result = await action()
    await captureTelemetryEvent(event, {
      ...properties,
      status: "success",
      duration_ms: Date.now() - startedAt,
    })
    return result
  } catch (error) {
    await captureTelemetryEvent(event, {
      ...properties,
      status: "error",
      duration_ms: Date.now() - startedAt,
      error_name: error instanceof Error ? error.name : "UnknownError",
      error_message: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
