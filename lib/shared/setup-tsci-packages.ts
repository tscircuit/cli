import { detectPackageManager } from "./detect-pkg-manager"
import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"

/**
 * Initializes a project in the specified directory, reads its name, and installs dependencies.
 *
 * @param {string} packageManager - Package manager to use (npm, yarn, pnpm, bun).
 * @param {string[]} dependencies - List of dependencies to install.
 * @param {string} directory - Directory where the project should be initialized.
 */
export function setupTsciProject(
  directory = process.cwd(),
  dependencies = ["@types/react", "@tscircuit/core"],
) {
  const projectPath = path.resolve(directory)
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true })
  }
  const packageManager = detectPackageManager()

  console.log(`Initializing project in ${projectPath}...`)
  process.chdir(projectPath)

  if (!fs.existsSync("package.json")) {
    const initCommand =
      packageManager === "yarn"
        ? "yarn init -y"
        : packageManager === "pnpm"
          ? "pnpm init"
          : packageManager === "bun"
            ? "bun init -y"
            : "npm init -y"

    execSync(initCommand, { stdio: "inherit" })
    console.log("Project initialized successfully.")
  }

  // Read and modify package.json
  const packageJsonPath = path.join(projectPath, "package.json")
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))

  // Remove unwanted fields
  delete packageJson.keywords
  delete packageJson.author
  delete packageJson.main

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
  console.log("Updated package.json to remove unnecessary fields.")

  if (dependencies.length > 0) {
    console.log("Installing dependencies...")
    const installCommand =
      packageManager === "yarn"
        ? `yarn add -D ${dependencies.join(" ")}`
        : packageManager === "pnpm"
          ? `pnpm add -D ${dependencies.join(" ")}`
          : packageManager === "bun"
            ? `bun add -D ${dependencies.join(" ")}`
            : `npm install -D ${dependencies.join(" ")}`

    execSync(installCommand, { stdio: "inherit" })
    console.log("Dependencies installed successfully.")
  }

  return packageJson.name || "unknown"
}
