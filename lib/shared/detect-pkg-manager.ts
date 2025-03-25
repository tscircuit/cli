import fs from "fs"

// Detect the package manager being used in the project
export const detectPackageManager = (): string => {
  const userAgent = process.env.npm_config_user_agent || ""
  if (userAgent.startsWith("yarn")) return "yarn"
  if (userAgent.startsWith("pnpm")) return "pnpm"
  if (userAgent.startsWith("bun")) return "bun"

  if (fs.existsSync("yarn.lock")) return "yarn"
  if (fs.existsSync("pnpm-lock.yaml")) return "pnpm"
  if (fs.existsSync("package-lock.json")) return "npm"
  if (fs.existsSync("bun.lockb")) return "bun"
  if (fs.existsSync("bun.lock")) return "bun"

  // Check if bun is available in the shell
  try {
    const result = Bun.spawnSync(["bun", "--version"], {
      stdout: "ignore",
      stderr: "ignore",
    })
    if (result.exitCode === 0) return "bun"
  } catch (error) {
    // Bun is not available
  }

  return "npm" // Default to npm
}
