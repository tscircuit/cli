import { expect, test } from "bun:test"
import Debug from "debug"
import { enableDevVerboseLoggingForTest } from "cli/dev/register"

const getDebugNamespaces = () =>
  (process.env.DEBUG ?? "")
    .split(/[\s,]+/)
    .map((ns) => ns.trim())
    .filter(Boolean)

test("verbose helper enables tscircuit devserver namespace", () => {
  const originalEnv = process.env.DEBUG
  Debug.disable()
  process.env.DEBUG = ""

  try {
    enableDevVerboseLoggingForTest()

    const namespaces = getDebugNamespaces()
    expect(namespaces).toContain("tscircuit:devserver")

    const logger = Debug("tscircuit:devserver")
    expect(logger.enabled).toBeTrue()
  } finally {
    process.env.DEBUG = originalEnv
    Debug.disable()
  }
})
