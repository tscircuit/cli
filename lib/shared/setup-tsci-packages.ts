import { detectPackageManager } from "./detect-pkg-manager"
import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"

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

    try {
      execSync(initCommand, { stdio: "inherit" })
      console.log("Project initialized successfully.")
    } catch (error) {
      console.warn("Failed to automatically inititialize project.")
      console.warn("Please inititialize using the command:")
      console.warn(`  ${initCommand}`)
    }
  }

  // Read and modify package.json
  const packageJsonPath = path.join(projectPath, "package.json")
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
  console.log("Updated package.json to remove unnecessary fields.")

  if (dependencies.length > 0) {
    console.log("Installing dependencies...")
    const installCommand =
      packageManager === "bun"
        ? `bun add -D ${dependencies.join(" ")}`
        : packageManager === "yarn"
          ? `yarn add -D ${dependencies.join(" ")}`
          : packageManager === "pnpm"
            ? `pnpm add -D ${dependencies.join(" ")}`
            : `npm install -D ${dependencies.join(" ")}`

    try {
      execSync(installCommand, { stdio: "inherit" })
      console.log("Dependencies installed successfully.")
    } catch (error) {
      console.warn("Failed to automatically install the required dependencies.")
      console.warn("Please install them manually using the command:")
      console.warn(`  ${installCommand}`)
    }
  }
  return packageJson.name || "unknown"
}
