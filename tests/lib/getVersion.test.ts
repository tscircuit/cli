import { afterEach, expect, test } from "bun:test"
import { getVersion, getVersionInfo } from "lib/getVersion"

type GlobalWithTscircuitVersion = typeof globalThis & {
  TSCIRCUIT_VERSION?: string
}

afterEach(() => {
  delete (globalThis as GlobalWithTscircuitVersion).TSCIRCUIT_VERSION
})

test("getVersion prefers global TSCIRCUIT_VERSION when available", () => {
  ;(globalThis as GlobalWithTscircuitVersion).TSCIRCUIT_VERSION = "9.9.9"

  const output = getVersion()

  expect(output).toBe("9.9.9")
})

test("getVersionInfo falls back to package resolver when global version is absent", () => {
  const versions = getVersionInfo((packageName) => {
    if (packageName === "tscircuit") return "1.2.3"
    if (packageName === "@tscircuit/runframe") return "4.5.6"
    if (packageName === "@tscircuit/core") return "7.8.9"
    return undefined
  })

  expect(versions.tscircuitVersion).toBe("1.2.3")
  expect(versions.runframeVersion).toBe("4.5.6")
  expect(versions.coreVersion).toBe("7.8.9")
  expect(versions.cliVersion).toBeString()
})

test("getVersion verbose output prints all requested packages", () => {
  ;(globalThis as GlobalWithTscircuitVersion).TSCIRCUIT_VERSION = "3.2.1"

  const output = getVersion({ verbose: true })

  expect(output).toContain("tscircuit: 3.2.1")
  expect(output).toContain("@tscircuit/cli:")
  expect(output).toContain("@tscircuit/runframe:")
  expect(output).toContain("@tscircuit/core:")
})
