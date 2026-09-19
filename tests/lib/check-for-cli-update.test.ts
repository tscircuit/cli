import { afterEach, describe, expect, test } from "bun:test"
import { getCliVersion } from "lib/getVersion"
import {
  checkForTsciUpdates,
  currentCliVersion,
} from "lib/shared/check-for-cli-update"

describe("check-for-cli-update", () => {
  const originalEnv = process.env.TSCI_SKIP_CLI_UPDATE

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.TSCI_SKIP_CLI_UPDATE = originalEnv
    } else {
      delete process.env.TSCI_SKIP_CLI_UPDATE
    }
  })

  test("currentCliVersion returns the real package version from getCliVersion", () => {
    expect(currentCliVersion()).toBe(getCliVersion())
  })

  test("checkForTsciUpdates returns false immediately when TSCI_SKIP_CLI_UPDATE is true", async () => {
    process.env.TSCI_SKIP_CLI_UPDATE = "true"
    const result = await checkForTsciUpdates()
    expect(result).toBe(false)
  })

  test("checkForTsciUpdates returns false in non-interactive environment", async () => {
    delete process.env.TSCI_SKIP_CLI_UPDATE
    const result = await checkForTsciUpdates()
    expect(result).toBe(false)
  })
})
