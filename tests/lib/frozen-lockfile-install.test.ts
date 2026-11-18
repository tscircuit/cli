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

test.each([
  ["bun", "bun install --frozen-lockfile"],
  ["npm", "npm ci"],
  ["pnpm", "pnpm install --frozen-lockfile"],
  ["yarn", "yarn install --frozen-lockfile"],
])(
  "%s can install without updating a published lockfile",
  (manager, command) => {
    process.env.npm_config_user_agent = `${manager}/1.0.0`
    expect(
      getPackageManager().getInstallAllCommand({ frozenLockfile: true }),
    ).toBe(command)
    expect(getPackageManager().getInstallAllCommand()).toBe(
      `${manager} install`,
    )
  },
)
