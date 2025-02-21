import axios from "axios"
import * as fs from "node:fs"
async function fetchLatestVersion() {
  try {
    const response = await fetch("https://registry.npmjs.org/@tscircuit/cli")
    const data = await response.json()
    const latestVersion = data["dist-tags"].latest
    const packageManager = detectPackageManager()
    const currentVersion = 2.23
    if (latestVersion !== currentVersion) {
      const installCommand = getGlobalInstallCommand(
        packageManager,
        "@tscircuit/cli",
      )
      console.warn(
        `\u26A0 You are using version ${currentVersion}, but the latest version is ${latestVersion}. Consider updating with "${installCommand}".`,
      )
    } else {
      console.info(
        `\u2713 You are using the latest version (${currentVersion}).`,
      )
    }
  } catch (error) {
    console.error(
      "\u26A0 Could not check the latest version. Please check your network connection.",
    )
  }
}
const getGlobalInstallCommand = (packageManager, packageName) => {
  switch (packageManager) {
    case "yarn":
      return `yarn global add ${packageName}`
    case "pnpm":
      return `pnpm add -g ${packageName}`
    case "bun":
      return `bun add -g ${packageName}`
    default:
      return `npm install -g ${packageName}`
  }
}

fetchLatestVersion()

export const detectPackageManager = () => {
  const userAgent = process.env.npm_config_user_agent || ""
  if (userAgent.startsWith("yarn")) return "yarn"
  if (userAgent.startsWith("pnpm")) return "pnpm"
  if (userAgent.startsWith("bun")) return "bun"

  if (fs.existsSync("yarn.lock")) return "yarn"
  if (fs.existsSync("pnpm-lock.yaml")) return "pnpm"
  if (fs.existsSync("bun.lockb")) return "bun"

  return "npm" // Default to npm
}
