import fs from "node:fs"
import path from "node:path"
import { getPackageManager } from "./get-package-manager"

export async function setupTsciProject(
  directory = process.cwd(),
  dependencies = ["@types/react", "@tscircuit/core"],
) {
  const projectPath = path.resolve(directory)
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true })
  }
  const packageManager = getPackageManager()

  console.log(`Initializing project in ${projectPath}...`)
  process.chdir(projectPath)

  if (!fs.existsSync("package.json")) {
    try {
      packageManager.init({ cwd: projectPath })
      console.log("Project initialized successfully.")
    } catch (error) {
      console.warn("Failed to automatically initialize project.")
      const initCommand = packageManager.getInitCommand()
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
    try {
      packageManager.installDeps({
        deps: dependencies,
        cwd: projectPath,
        dev: true,
      })
      console.log("Dependencies installed successfully.")
    } catch (error) {
      console.warn("Failed to automatically install the required dependencies.")
      const installCommand = packageManager.getInstallDepsCommand(dependencies, true)
      console.warn("Please install them manually using the command:")
      console.warn(`  ${installCommand}`)
    }
  }
  return packageJson.name || "unknown"
}
