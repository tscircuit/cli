import { afterEach, expect, test } from "bun:test"
import { getPackageManager } from "lib/shared/get-package-manager"

const originalUserAgent = process.env.npm_config_user_agent

afterEach(() => {
  if (originalUserAgent === undefined) {
    Reflect.deleteProperty(process.env, "npm_config_user_agent")
  } else {
    process.env.npm_config_user_agent = originalUserAgent
  }
})

test("Bun preserves a published lockfile", () => {
  process.env.npm_config_user_agent = "bun/1.0.0"
  const packageManager = getPackageManager()

  expect(packageManager.getInstallAllCommand({ frozenLockfile: true })).toBe(
    "bun install --frozen-lockfile",
  )
  expect(packageManager.getInstallAllCommand()).toBe("bun install")
})

test("npm preserves a published lockfile", () => {
  process.env.npm_config_user_agent = "npm/1.0.0"
  const packageManager = getPackageManager()

  expect(packageManager.getInstallAllCommand({ frozenLockfile: true })).toBe(
    "npm ci",
  )
  expect(packageManager.getInstallAllCommand()).toBe("npm install")
})

test("pnpm preserves a published lockfile", () => {
  process.env.npm_config_user_agent = "pnpm/1.0.0"
  const packageManager = getPackageManager()

  expect(packageManager.getInstallAllCommand({ frozenLockfile: true })).toBe(
    "pnpm install --frozen-lockfile",
  )
  expect(packageManager.getInstallAllCommand()).toBe("pnpm install")
})

test("Yarn preserves a published lockfile", () => {
  process.env.npm_config_user_agent = "yarn/1.0.0"
  const packageManager = getPackageManager()

  expect(packageManager.getInstallAllCommand({ frozenLockfile: true })).toBe(
    "yarn install --frozen-lockfile",
  )
  expect(packageManager.getInstallAllCommand()).toBe("yarn install")
})
