import { afterEach, expect, test } from "bun:test"
import { prompts } from "lib/utils/prompts"

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

test("confirm prompts auto-resolve to yes when --non-interactive flag is passed", async () => {
  process.argv = [...originalArgv, "--non-interactive"]

  const result = await prompts({
    name: "shouldContinue",
    type: "confirm",
    initial: false,
    message: "continue?",
  })

  expect(result).toEqual({ shouldContinue: true })
})

test("confirm prompts auto-resolve to yes when TSCIRCUIT_NON_INTERACTIVE=1", async () => {
  process.env.TSCIRCUIT_NON_INTERACTIVE = "1"

  const result = await prompts({
    name: "shouldContinue",
    type: "confirm",
    initial: false,
    message: "continue?",
  })

  expect(result).toEqual({ shouldContinue: true })
})

test("confirm prompts auto-resolve to yes when stdin is not a tty", async () => {
  process.env.NODE_ENV = "production"
  process.env.CI = ""
  process.env.TSCI_TEST_MODE = ""
  process.env.TSCIRCUIT_NON_INTERACTIVE = ""
  process.argv = originalArgv.filter((arg) => arg !== "--non-interactive")

  Object.defineProperty(process.stdin, "isTTY", {
    value: false,
    configurable: true,
  })
  Object.defineProperty(process.stdout, "isTTY", {
    value: true,
    configurable: true,
  })

  const result = await prompts({
    name: "shouldContinue",
    type: "confirm",
    initial: false,
    message: "continue?",
  })

  expect(result).toEqual({ shouldContinue: true })
})
