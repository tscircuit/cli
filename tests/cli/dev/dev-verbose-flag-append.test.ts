import { expect, test } from "bun:test"
import Debug from "debug"
import { enableDevVerboseLoggingForTest } from "cli/dev/register"

const getDebugNamespaces = () =>
  (process.env.DEBUG ?? "")
    .split(/[\s,]+/)
    .map((ns) => ns.trim())
    .filter(Boolean)

test("verbose helper appends without duplicating existing namespaces", () => {
  const originalEnv = process.env.DEBUG
  Debug.disable()
  process.env.DEBUG = "foo,bar"

  try {
    enableDevVerboseLoggingForTest()

    const namespaces = getDebugNamespaces()
    expect(namespaces).toEqual(
      expect.arrayContaining(["foo", "bar", "tscircuit:devserver"]),
    )

    const occurrences = namespaces.filter(
      (ns) => ns === "tscircuit:devserver",
    ).length
    expect(occurrences).toBe(1)
  } finally {
    process.env.DEBUG = originalEnv
    Debug.disable()
  }
})
