import { afterEach, expect, test } from "bun:test"
import { shouldBeInteractive } from "lib/utils/should-be-interactive"

const originalNodeEnv = process.env.NODE_ENV
const originalCi = process.env.CI
const originalTestMode = process.env.TSCI_TEST_MODE
const originalNonInteractiveEnv = process.env.TSCIRCUIT_NON_INTERACTIVE
const originalArgv = [...process.argv]
const originalStdinIsTTY = process.stdin.isTTY
const originalStdoutIsTTY = process.stdout.isTTY

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv
  process.env.CI = originalCi
  process.env.TSCI_TEST_MODE = originalTestMode
  process.env.TSCIRCUIT_NON_INTERACTIVE = originalNonInteractiveEnv
  process.argv = [...originalArgv]

  Object.defineProperty(process.stdin, "isTTY", {
    value: originalStdinIsTTY,
    configurable: true,
  })
  Object.defineProperty(process.stdout, "isTTY", {
    value: originalStdoutIsTTY,
    configurable: true,
  })
})

test("returns false when --non-interactive is provided", () => {
  process.argv = [...originalArgv, "--non-interactive"]

  expect(shouldBeInteractive()).toBe(false)
})

test("returns false when TSCIRCUIT_NON_INTERACTIVE is 1", () => {
  process.env.TSCIRCUIT_NON_INTERACTIVE = "1"

  expect(shouldBeInteractive()).toBe(false)
})

test("returns false when stdin is not a tty", () => {
  Object.defineProperty(process.stdin, "isTTY", {
    value: false,
    configurable: true,
  })
  Object.defineProperty(process.stdout, "isTTY", {
    value: true,
    configurable: true,
  })

  expect(shouldBeInteractive()).toBe(false)
})

test("returns true when tty is available and no non-interactive flags are set", () => {
  process.env.NODE_ENV = "production"
  process.env.CI = ""
  process.env.TSCI_TEST_MODE = ""
  process.env.TSCIRCUIT_NON_INTERACTIVE = ""
  process.argv = originalArgv.filter((arg) => arg !== "--non-interactive")

  Object.defineProperty(process.stdin, "isTTY", {
    value: true,
    configurable: true,
  })
  Object.defineProperty(process.stdout, "isTTY", {
    value: true,
    configurable: true,
  })

  expect(shouldBeInteractive()).toBe(true)
})
