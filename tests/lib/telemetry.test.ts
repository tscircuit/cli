import { rm } from "node:fs/promises"
import { temporaryDirectory } from "tempy"
import { expect, test } from "bun:test"
import { getCliConfig } from "lib/cli-config"
import { getTelemetryDistinctId } from "lib/telemetry"

test("telemetry distinct id is stable for anonymous users", async () => {
  const configDir = temporaryDirectory()
  const config = getCliConfig({ configDir })

  try {
    const firstDistinctId = getTelemetryDistinctId(config)
    const secondDistinctId = getTelemetryDistinctId(config)

    expect(firstDistinctId).toBe(secondDistinctId)
    expect(firstDistinctId).toStartWith("anonymous:")
    expect(config.get("telemetryAnonymousId")).toBe(
      firstDistinctId.replace("anonymous:", ""),
    )
  } finally {
    config.clear()
    await rm(configDir, { recursive: true, force: true })
  }
})

test("telemetry distinct id uses account id for authenticated users", async () => {
  const configDir = temporaryDirectory()
  const config = getCliConfig({ configDir })

  try {
    config.set("accountId", "account-123")

    expect(getTelemetryDistinctId(config)).toBe("account:account-123")
    expect(config.get("telemetryAnonymousId")).toBeUndefined()
  } finally {
    config.clear()
    await rm(configDir, { recursive: true, force: true })
  }
})
